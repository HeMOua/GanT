use serde_json::{json, Value};
fn date(s: &str) -> bool {
    (s.len() == 7 && chrono::NaiveDate::parse_from_str(&format!("{}-01", s), "%Y-%m-%d").is_ok())
        || (s.len() == 10 && chrono::NaiveDate::parse_from_str(s, "%Y-%m-%d").is_ok())
}
fn validate(v: &Value, records: &[Value], id: i64) -> Result<(), String> {
    for key in [
        "title",
        "project_name",
        "person",
        "role",
        "start",
        "end",
        "cutoff",
        "tags",
        "notes",
    ] {
        let text = v[key].as_str().ok_or("请检查填写内容")?;
        if text.len() > if key == "notes" { 40000 } else { 2000 } {
            return Err("填写内容过长".into());
        }
    }
    for key in ["title", "project_name", "person"] {
        if v[key].as_str().unwrap().trim().is_empty() {
            return Err("请填写项目、人员和名称".into());
        }
    }
    let kind = v["kind"].as_str().unwrap_or("");
    let tracking = v["tracking"].as_str().unwrap_or("");
    if !["participation", "work", "milestone"].contains(&kind)
        || !["following", "cutoff", "ended"].contains(&tracking)
        || !v["is_self"].is_boolean()
        || !v["approximate"].is_boolean()
    {
        return Err("记录类型或状态无效".into());
    }
    let start = v["start"].as_str().unwrap();
    let end = v["end"].as_str().unwrap();
    let cutoff = v["cutoff"].as_str().unwrap();
    if !date(start) || (!end.is_empty() && !date(end)) || (!cutoff.is_empty() && !date(cutoff)) {
        return Err("日期请填写 YYYY-MM 或 YYYY-MM-DD".into());
    }
    if (!end.is_empty()
        && (&end[..7] < &start[..7] || (end.len() == 10 && start.len() == 10 && end < start)))
        || (!cutoff.is_empty()
            && (&cutoff[..7] < &start[..7]
                || (cutoff.len() == 10 && start.len() == 10 && cutoff < start)))
    {
        return Err("结束或截止时间不能早于开始时间".into());
    }
    if kind != "milestone"
        && ((tracking == "ended") != !end.is_empty()
            || (tracking == "cutoff") != !cutoff.is_empty())
    {
        return Err("请填写对应的结束或记录截止时间".into());
    }
    if kind == "participation" {
        if !v["parent_id"].is_null() {
            return Err("参与经历不能有上级".into());
        }
        if records.iter().any(|r| {
            r["parent_id"] == id
                && ["person", "project_name", "is_self"]
                    .iter()
                    .any(|k| r[*k] != v[*k])
        }) {
            return Err("已有工作记录，请保持项目和人员一致".into());
        }
    } else {
        let p = records
            .iter()
            .find(|r| r["id"] == v["parent_id"] && r["kind"] == "participation")
            .ok_or("请选择对应的项目参与经历")?;
        if ["person", "project_name", "is_self"]
            .iter()
            .any(|k| p[*k] != v[*k])
        {
            return Err("请选择对应的项目参与经历".into());
        }
    }
    Ok(())
}
pub fn dispatch(
    s: &mut Value,
    method: &str,
    id: Option<i64>,
    mut data: Value,
) -> Result<Value, String> {
    if !s["journeys"].is_array() {
        s["journeys"] = json!([]);
    }
    if method == "GET" {
        return Ok(s["journeys"].clone());
    }
    let records = s["journeys"].as_array().unwrap();
    if method == "DELETE" {
        let id = id.ok_or("记录不存在")?;
        if records.iter().any(|r| r["parent_id"] == id) {
            return Err("请先删除这段参与经历下的工作和节点".into());
        }
        s["journeys"]
            .as_array_mut()
            .unwrap()
            .retain(|r| r["id"] != id);
        return Ok(Value::Null);
    }
    if method != "POST" && method != "PATCH" {
        return Err("不支持的操作".into());
    }
    if method == "PATCH" && !records.iter().any(|r| r["id"].as_i64() == id) {
        return Err("记录不存在".into());
    }
    validate(&data, records, id.unwrap_or(-1))?;
    let assigned = if method == "POST" {
        let n = s["next"].as_i64().unwrap();
        s["next"] = json!(n + 1);
        n
    } else {
        id.unwrap()
    };
    data["id"] = json!(assigned);
    let rows = s["journeys"].as_array_mut().unwrap();
    if method == "POST" {
        rows.push(data.clone());
    } else {
        *rows.iter_mut().find(|r| r["id"] == assigned).unwrap() = data.clone();
    }
    Ok(data)
}
#[cfg(test)]
mod tests {
    use super::*;
    fn record() -> Value {
        json!({"kind":"participation","parent_id":null,"project_name":"模拟项目","person":"我","is_self":true,"title":"参与项目","role":"开发","start":"2025-03","end":"","cutoff":"","tracking":"following","approximate":false,"tags":"","notes":""})
    }
    #[test]
    fn survives_reopen_and_invalid_save_rolls_back() {
        let dir = std::env::temp_dir().join(format!("gant-journey-test-{}", std::process::id()));
        std::fs::create_dir_all(&dir).unwrap();
        let path = dir.join("synthetic.sqlite3");
        {
            let mut db = crate::storage::open(&path).unwrap();
            crate::storage::request(&mut db, "POST", "/journeys", record()).unwrap();
            let mut invalid = record();
            invalid["tracking"] = json!("cutoff");
            assert!(crate::storage::request(&mut db, "PATCH", "/journeys/1", invalid).is_err());
        }
        {
            let mut db = crate::storage::open(&path).unwrap();
            let records =
                crate::storage::request(&mut db, "GET", "/journeys", Value::Null).unwrap();
            assert_eq!(records.as_array().unwrap().len(), 1);
            assert_eq!(records[0]["tracking"], "following");
        }
        std::fs::remove_dir_all(dir).unwrap();
    }
    #[test]
    fn dates_and_unknown_end() {
        let mut s = json!({"next":1});
        let v = dispatch(&mut s, "POST", None, record()).unwrap();
        assert_eq!(v["end"], "");
        let mut v = v;
        v["tracking"] = json!("cutoff");
        assert!(dispatch(&mut s, "PATCH", Some(1), v.clone()).is_err());
        v["cutoff"] = json!("2025-06");
        assert!(dispatch(&mut s, "PATCH", Some(1), v.clone()).is_ok());
        v["start"] = json!("2025-02-30");
        assert!(dispatch(&mut s, "PATCH", Some(1), v).is_err());
    }
    #[test]
    fn repeated_participation_and_children() {
        let mut s = json!({"next":1});
        dispatch(&mut s, "POST", None, record()).unwrap();
        dispatch(&mut s, "POST", None, record()).unwrap();
        let mut child = record();
        child["kind"] = json!("work");
        child["parent_id"] = json!(1);
        dispatch(&mut s, "POST", None, child).unwrap();
        assert!(dispatch(&mut s, "DELETE", Some(1), Value::Null).is_err());
        dispatch(&mut s, "DELETE", Some(3), Value::Null).unwrap();
        dispatch(&mut s, "DELETE", Some(1), Value::Null).unwrap();
        assert_eq!(s["journeys"].as_array().unwrap().len(), 1);
    }
}
