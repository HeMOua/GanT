use rusqlite::{params, Connection};
use serde_json::{json, Value};
use std::path::Path;

pub fn open(path: &Path) -> rusqlite::Result<Connection> {
    let db = Connection::open(path)?;
    db.execute_batch("PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; CREATE TABLE IF NOT EXISTS workspace(id INTEGER PRIMARY KEY CHECK(id=1), data TEXT NOT NULL);")?;
    db.execute(
        "INSERT OR IGNORE INTO workspace VALUES(1, ?1)",
        [json!({"next":1,"projects":[],"tasks":[],"members":[]}).to_string()],
    )?;
    Ok(db)
}
fn err() -> String {
    "操作无效，请检查项目、任务或成员是否仍然存在".into()
}
fn list<'a>(s: &'a Value, key: &str) -> &'a Vec<Value> {
    s[key].as_array().unwrap()
}
fn rows<'a>(s: &'a mut Value, key: &str) -> &'a mut Vec<Value> {
    s[key].as_array_mut().unwrap()
}
fn get(s: &Value, key: &str, id: i64) -> Result<Value, String> {
    list(s, key)
        .iter()
        .find(|v| v["id"] == id)
        .cloned()
        .ok_or_else(err)
}
fn next(s: &mut Value) -> i64 {
    let id = s["next"].as_i64().unwrap();
    s["next"] = json!(id + 1);
    id
}
fn merge(a: &mut Value, b: &Value) {
    for (k, v) in b.as_object().into_iter().flatten() {
        if ![
            "id",
            "created_at",
            "project_id",
            "dependencies",
            "assignees",
        ]
        .contains(&k.as_str())
        {
            a[k] = v.clone();
        }
    }
}
fn name(v: &Value) -> Result<(), String> {
    if v["name"].as_str().unwrap_or("").trim().is_empty() {
        Err("名称不能为空".into())
    } else {
        Ok(())
    }
}
fn validate_task(s: &Value, t: &Value) -> Result<(), String> {
    name(t)?;
    let start = t["start_time"].as_str().ok_or("请选择开始日期")?;
    let end = t["end_time"].as_str().ok_or("请选择结束日期")?;
    if chrono::NaiveDate::parse_from_str(start, "%Y-%m-%d").is_err()
        || chrono::NaiveDate::parse_from_str(end, "%Y-%m-%d").is_err()
        || end < start
    {
        return Err("任务日期范围无效".into());
    }
    if !["NOT_STARTED", "IN_PROGRESS", "DONE", "BLOCKED"]
        .contains(&t["status"].as_str().unwrap_or(""))
        || !(0..=100).contains(&t["progress"].as_i64().unwrap_or(-1))
    {
        return Err("任务状态或进度无效".into());
    }
    let mut parent = t["parent_id"].as_i64();
    let mut seen = vec![t["id"].as_i64().unwrap()];
    while let Some(id) = parent {
        if seen.contains(&id) {
            return Err("任务层级不能形成循环".into());
        }
        seen.push(id);
        let p = get(s, "tasks", id)?;
        if p["project_id"] != t["project_id"] {
            return Err(err());
        }
        parent = p["parent_id"].as_i64();
    }
    Ok(())
}
pub fn request(
    db: &mut Connection,
    method: &str,
    path: &str,
    data: Value,
) -> Result<Value, String> {
    let tx = db.transaction().map_err(|_| "无法开始保存")?;
    let raw: String = tx
        .query_row("SELECT data FROM workspace WHERE id=1", [], |r| r.get(0))
        .map_err(|_| "无法读取本地数据")?;
    let mut s: Value = serde_json::from_str(&raw).map_err(|_| "数据格式异常，请恢复备份")?;
    let result = dispatch(&mut s, method, path, data)?;
    if method != "GET" {
        tx.execute(
            "UPDATE workspace SET data=?1 WHERE id=1",
            params![s.to_string()],
        )
        .map_err(|_| "保存失败，请检查磁盘空间")?;
    }
    tx.commit().map_err(|_| "保存失败，请重试")?;
    Ok(result)
}
fn dispatch(s: &mut Value, method: &str, path: &str, data: Value) -> Result<Value, String> {
    let parts: Vec<_> = path.trim_matches('/').split('/').collect();
    let kind = parts[0];
    let id = parts.get(1).and_then(|x| x.parse::<i64>().ok());
    if kind == "journeys" {
        return crate::journey::dispatch(s, method, id, data);
    }
    if kind == "users" || kind == "members" {
        if method == "GET" {
            return Ok(s["members"].clone());
        }
        if method == "POST" {
            let n = data["display_name"]
                .as_str()
                .or(data["name"].as_str())
                .unwrap_or("")
                .trim();
            if n.is_empty() {
                return Err("请输入成员姓名".into());
            }
            let v = json!({"id":next(s),"name":n,"display_name":n,"username":data["username"].as_str().unwrap_or(n),"role":"USER","created_at":chrono::Utc::now().to_rfc3339()});
            rows(s, "members").push(v.clone());
            return Ok(v);
        }
        let id = id.ok_or_else(err)?;
        let mut v = get(s, "members", id)?;
        if method == "PATCH" {
            merge(&mut v, &data);
            rows(s, "members")
                .iter_mut()
                .find(|x| x["id"] == id)
                .map(|x| *x = v.clone());
            return Ok(v);
        }
        if method == "DELETE" {
            rows(s, "members").retain(|x| x["id"] != id);
            for t in rows(s, "tasks") {
                t["assignees"]
                    .as_array_mut()
                    .unwrap()
                    .retain(|a| a["user_id"] != id);
            }
            return Ok(Value::Null);
        }
    }
    if kind == "projects" {
        if parts.len() == 1 && method == "GET" {
            let mut projects = s["projects"].clone();
            for p in projects.as_array_mut().unwrap() {
                let tasks: Vec<_> = list(s, "tasks")
                    .iter()
                    .filter(|t| t["project_id"] == p["id"])
                    .collect();
                p["totalTasks"] = json!(tasks.len());
                p["doneTasks"] = json!(tasks.iter().filter(|t| t["status"] == "DONE").count());
                p["inProgressTasks"] = json!(tasks
                    .iter()
                    .filter(|t| t["status"] == "IN_PROGRESS")
                    .count());
            }
            return Ok(projects);
        }
        if parts.len() == 1 && method == "POST" {
            name(&data)?;
            let mut p = json!({"id":next(s),"status":"ACTIVE","created_at":chrono::Utc::now().to_rfc3339()});
            merge(&mut p, &data);
            p["updated_at"] = p["created_at"].clone();
            rows(s, "projects").push(p.clone());
            return Ok(p);
        }
        let id = id.ok_or_else(err)?;
        let mut p = get(s, "projects", id)?;
        if parts.get(2) == Some(&"seed") && method == "POST" {
            if list(s, "tasks").iter().any(|t| t["project_id"] == id) {
                return Err("只有空项目可以添加演示任务".into());
            }
            let today = chrono::Local::now().date_naive();
            let mut previous = None;
            for (index, title) in ["需求梳理", "设计与实施", "验收交付"].iter().enumerate()
            {
                let task_id = next(s);
                let start = today + chrono::Duration::days(index as i64 * 4);
                let end = start + chrono::Duration::days(3);
                let mut task = json!({"id":task_id,"project_id":id,"name":title,"parent_id":null,"start_time":start.to_string(),"end_time":end.to_string(),"progress":0,"status":"NOT_STARTED","order":index,"assignees":[],"dependencies":[]});
                if let Some(dep) = previous {
                    task["dependencies"] =
                        json!([{"task_id":dep,"type":"FS","lag":0,"_dep_id":next(s)}]);
                }
                rows(s, "tasks").push(task);
                previous = Some(task_id);
            }
            return Ok(json!({"message":"演示任务已添加"}));
        }
        if parts.get(2) == Some(&"tasks") {
            if method == "GET" {
                let mut tasks: Vec<_> = list(s, "tasks")
                    .iter()
                    .filter(|t| t["project_id"] == id)
                    .cloned()
                    .collect();
                tasks.sort_by_key(|t| {
                    (
                        t["order"].as_i64().unwrap_or(0),
                        t["id"].as_i64().unwrap_or(0),
                    )
                });
                return Ok(json!(tasks));
            }
            if method == "POST" {
                let mut t = json!({"id":next(s),"project_id":id,"parent_id":null,"status":"NOT_STARTED","progress":0,"order":0,"dependencies":[],"assignees":[]});
                merge(&mut t, &data);
                validate_task(s, &t)?;
                rows(s, "tasks").push(t.clone());
                return Ok(t);
            }
        }
        if parts.len() == 2 {
            if method == "GET" {
                return Ok(p);
            }
            if method == "PATCH" {
                merge(&mut p, &data);
                name(&p)?;
                p["updated_at"] = json!(chrono::Utc::now().to_rfc3339());
                *rows(s, "projects")
                    .iter_mut()
                    .find(|v| v["id"] == id)
                    .unwrap() = p.clone();
                return Ok(p);
            }
            if method == "DELETE" {
                rows(s, "projects").retain(|p| p["id"] != id);
                rows(s, "tasks").retain(|t| t["project_id"] != id);
                return Ok(Value::Null);
            }
        }
    }
    if kind == "tasks" {
        let id = id.ok_or_else(err)?;
        let mut t = get(s, "tasks", id)?;
        if parts.len() == 2 {
            if method == "PATCH" {
                merge(&mut t, &data);
                validate_task(s, &t)?;
            } else if method == "DELETE" {
                rows(s, "tasks").retain(|t| t["id"] != id);
                for other in rows(s, "tasks") {
                    if other["parent_id"] == id {
                        other["parent_id"] = Value::Null;
                    }
                    other["dependencies"]
                        .as_array_mut()
                        .unwrap()
                        .retain(|d| d["task_id"] != id);
                }
                return Ok(Value::Null);
            } else {
                return Err(err());
            }
        } else {
            let key = parts[2];
            if !["dependencies", "assignees"].contains(&key) {
                return Err(err());
            }
            let field = if key == "dependencies" {
                "_dep_id"
            } else {
                "_assignee_id"
            };
            if method == "POST" {
                let mut v = if key == "dependencies" {
                    let dep = data["depends_on_task_id"].as_i64().ok_or_else(err)?;
                    let d = get(s, "tasks", dep)?;
                    if dep == id || d["project_id"] != t["project_id"] {
                        return Err("请选择同项目的其他任务".into());
                    }
                    let mut pending = vec![dep];
                    let mut seen = vec![];
                    while let Some(n) = pending.pop() {
                        if n == id {
                            return Err("依赖不能形成循环".into());
                        }
                        if seen.contains(&n) {
                            continue;
                        }
                        seen.push(n);
                        for d in get(s, "tasks", n)?["dependencies"].as_array().unwrap() {
                            if let Some(n) = d["task_id"].as_i64() {
                                pending.push(n);
                            }
                        }
                    }
                    let ty = data["type"].as_str().unwrap_or("FS");
                    if !["FS", "SS", "FF"].contains(&ty) {
                        return Err(err());
                    }
                    if t[key]
                        .as_array()
                        .unwrap()
                        .iter()
                        .any(|d| d["task_id"] == dep)
                    {
                        return Err("该依赖已存在".into());
                    }
                    json!({"task_id":dep,"type":ty,"lag":data["lag"].as_i64().unwrap_or(0)})
                } else {
                    let member = data["user_id"]
                        .as_i64()
                        .or(data["member_id"].as_i64())
                        .ok_or_else(err)?;
                    let m = get(s, "members", member)?;
                    json!({"user_id":member,"name":m["name"],"role":data["role"],"from":data["from_date"],"to":data["to_date"]})
                };
                v[field] = json!(next(s));
                t[key].as_array_mut().unwrap().push(v);
            } else if method == "DELETE" {
                let relation = parts
                    .get(3)
                    .and_then(|x| x.parse::<i64>().ok())
                    .ok_or_else(err)?;
                t[key]
                    .as_array_mut()
                    .unwrap()
                    .retain(|v| v[field] != relation);
            } else {
                return Err(err());
            }
        }
        *rows(s, "tasks").iter_mut().find(|v| v["id"] == id).unwrap() = t.clone();
        return Ok(t);
    }
    Err("此操作在离线版中不可用".into())
}

#[cfg(test)]
mod tests {
    use super::*;
    #[test]
    fn persists_after_reopen_and_backup_is_consistent() {
        let dir = std::env::temp_dir().join(format!(
            "gant-storage-test-{}-{}",
            std::process::id(),
            chrono::Utc::now().timestamp_nanos_opt().unwrap()
        ));
        std::fs::create_dir(&dir).unwrap();
        let path = dir.join("workspace.sqlite3");
        let backup = dir.join("backup.sqlite3");
        {
            let mut db = open(&path).unwrap();
            request(
                &mut db,
                "POST",
                "/projects",
                json!({"name":"Synthetic project"}),
            )
            .unwrap();
            request(&mut db, "POST", "/projects/1/seed", json!({})).unwrap();
            assert!(request(&mut db, "POST", "/projects/1/seed", json!({})).is_err());
            db.execute("VACUUM INTO ?1", [backup.to_str().unwrap()])
                .unwrap();
        }
        for file in [&path, &backup] {
            let mut db = open(file).unwrap();
            assert_eq!(
                request(&mut db, "GET", "/projects", json!({})).unwrap()[0]["totalTasks"],
                3
            );
            assert_eq!(
                request(&mut db, "GET", "/projects/1/tasks", json!({}))
                    .unwrap()
                    .as_array()
                    .unwrap()
                    .len(),
                3
            );
        }
        std::fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn offline_lifecycle_and_rollback() {
        let mut db = open(Path::new(":memory:")).unwrap();
        let p = request(&mut db, "POST", "/projects", json!({"name":"Sample"})).unwrap();
        let path = format!("/projects/{}/tasks", p["id"]);
        let a = request(
            &mut db,
            "POST",
            &path,
            json!({"name":"A","start_time":"2026-01-01","end_time":"2026-01-02"}),
        )
        .unwrap();
        let b=request(&mut db,"POST",&path,json!({"name":"B","start_time":"2026-01-01","end_time":"2026-01-02","parent_id":a["id"]})).unwrap();
        assert!(request(
            &mut db,
            "PATCH",
            &format!("/tasks/{}", a["id"]),
            json!({"parent_id":b["id"]})
        )
        .is_err());
        assert!(request(
            &mut db,
            "PATCH",
            &format!("/tasks/{}", a["id"]),
            json!({"progress":101})
        )
        .is_err());
        request(
            &mut db,
            "POST",
            &format!("/tasks/{}/dependencies", b["id"]),
            json!({"depends_on_task_id":a["id"]}),
        )
        .unwrap();
        assert!(request(
            &mut db,
            "POST",
            &format!("/tasks/{}/dependencies", a["id"]),
            json!({"depends_on_task_id":b["id"]})
        )
        .is_err());
        request(&mut db, "DELETE", &format!("/tasks/{}", a["id"]), json!({})).unwrap();
        let tasks = request(&mut db, "GET", &path, json!({})).unwrap();
        assert_eq!(tasks.as_array().unwrap().len(), 1);
        assert!(tasks[0]["parent_id"].is_null());
        assert_eq!(tasks[0]["dependencies"], json!([]));
        request(
            &mut db,
            "DELETE",
            &format!("/projects/{}", p["id"]),
            json!({}),
        )
        .unwrap();
        assert_eq!(
            request(&mut db, "GET", "/projects", json!({})).unwrap(),
            json!([])
        );
    }
}
