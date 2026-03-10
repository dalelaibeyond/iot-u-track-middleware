# V6800 Device MQTT Message RAW and SIF Spec

**File Name**: `v6800_spec.md`

**Version**: 1.0

**Date**: 2026-03-04

**Scope**: V6800 device raw JSON message format and Spec from raw to SIF (Standard Intermediate Format) Conversion

---

---

## Part#1 Event or Response Messages (Device → Broker → App)

### 1. `DEV_MOD_INFO`

**Topic:** `V6800Upload/{deviceId}/Init`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "devies_init_req",
  "gateway_sn": "string",
  "gateway_ip": "string",
  "gateway_mac": "string",
  "uuid_number": "messageId",
  "data": [{
      "module_type": "string",
      "module_index": "string",
      "module_sn": "int",
      "module_m_num": "int",
      "module_u_num": "int",
      "module_sw_version": "string",
      "module_supplier": "string",
      "module_brand": "string",
      "module_model": "string"
    }]
}

// Spec from Raw → SIF
{
  "meta": { "topic": "...", "rawType": "msg_type" },
  "deviceId": "gateway_sn",
  "deviceType": "V6800",
  "messageType": "DEV_MOD_INFO",
  "messageId": "uuid_number",
  "ip": "gateway_ip",
  "mac": "gateway_mac",
  "data": [{ "moduleIndex": module_index, "fwVer": "module_sw_version", "moduleId": "module_sn", "uTotal": module_u_num }]
}

// Note:
// Fields discarded from raw to SIF:
//   - data[].module_type: Module type not needed in SIF
//   - data[].module_m_num: Manufacturing number not needed in SIF
//   - data[].module_supplier: Supplier info not needed in SIF
//   - data[].module_brand: Brand info not needed in SIF
//   - data[].module_model: Model info not needed in SIF
//
// Field transformations:
//   - gateway_sn → deviceId
//   - uuid_number → messageId
//   - gateway_ip → ip
//   - gateway_mac → mac
//   - data[].module_sn → data[].moduleId
//   - data[].module_index → data[].moduleIndex
//   - data[].module_u_num → data[].uTotal
//   - data[].module_sw_version → data[].fwVer
```

### 2. `MOD_CHNG_EVENT`

**Topic:** `V6800Upload/{deviceId}/DeviceChange`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "devices_changed_req",
  "gateway_sn": "string",
  "uuid_number": "string",
  "data": [
    {
      "module_type": "string",
      "module_sn": "string",
      "module_index": "int",
      "module_m_num": "int",
      "module_u_num": "int",
      "module_sw_version": "string",
      "module_supplier": "string",
      "module_brand": "string",
      "module_model": "string"
    }
  ]
}

// Spec from Raw → SIF
{
  "meta": { "topic": "...", "rawType": "msg_type" },
  "deviceId": "gateway_sn",
  "deviceType": "V6800",
  "messageType": "MOD_CHNG_EVENT",
  "messageId": "uuid_number",
  "data": [{ "moduleIndex": module_index, "fwVer": "module_sw_version", "moduleId": "module_sn", "uTotal": module_u_num }]
}

// Note:
// Fields discarded from raw to SIF:
//   - data[].module_type: Module type not needed in SIF
//   - data[].module_m_num: Manufacturing number not needed in SIF
//   - data[].module_supplier: Supplier info not needed in SIF
//   - data[].module_brand: Brand info not needed in SIF
//   - data[].module_model: Model info not needed in SIF
//
// Field transformations:
//   - gateway_sn → deviceId
//   - uuid_number → messageId
//   - data[].module_sn → data[].moduleId
//   - data[].module_index → data[].moduleIndex
//   - data[].module_u_num → data[].uTotal
//   - data[].module_sw_version → data[].fwVer
```

### 3. `HEARTBEAT`

**Topic:** `V6800Upload/{deviceId}/HeartBeat`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "heart_beat_req",
  "module_type": "string",
  "module_sn": "string",
  "bus_V": "string",
  "bus_I": "string",
  "main_power": "int",
  "backup_power": "int",
  "uuid_number": "string",
  "data": [
    {
      "module_index": "int",
      "module_sn": "string",
      "module_m_num": "int",
      "module_u_num": "int"
    }
  ]
}

// Spec from Raw → SIF
{
  "meta": {
    "topic": "...",
    "rawType": "msg_type",
    "busVoltage": "12.5",
    "busCurrent": "2.3",
    "mainPower": 1,
    "backupPower": 0
  },
  "deviceId": "module_sn",
  "deviceType": "V6800",
  "messageType": "HEARTBEAT",
  "messageId": "uuid_number",
  "data": [{ "moduleIndex": module_index, "moduleId": "module_sn", "uTotal": module_u_num }]
}

// Note:
// deviceId is extracted from module_sn field (not gateway_sn as in other messages).
//
// Fields discarded from raw to SIF:
//   - module_type: Module type not needed in SIF
//   - data[].module_m_num: Manufacturing number not needed in SIF
//
// Field transformations:
//   - module_sn → deviceId
//   - uuid_number → messageId
//   - data[].module_sn → data[].moduleId
//   - data[].module_index → data[].moduleIndex
//   - data[].module_u_num → data[].uTotal
//   - bus_V → meta.busVoltage
//   - bus_I → meta.busCurrent
//   - main_power → meta.mainPower
//   - backup_power → meta.backupPower
```

### 4. `RFID_EVENT`

**Topic:** `V6800Upload/{deviceId}/LabelState`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "u_state_changed_notify_req",
  "gateway_sn": "string",
  "uuid_number": "string",
  "data": [{
      "host_gateway_port_index": "int",
      "extend_module_sn": "string",
      "u_data": [{"u_index": "int", "new_state": "int","old_state": "int", "tag_code": "string","warning": "int"}]
    }]
}

// Spec from Raw → SIF
{
  "meta": { "topic": "...", "rawType": "msg_type" },
  "deviceId": "gateway_sn",
  "deviceType": "V6800",
  "messageType": "RFID_EVENT",
  "messageId": "uuid_number",
  "data": [{
      "moduleIndex": host_gateway_port_index,
      "moduleId": "extend_module_sn",
      "data": [{ "sensorIndex": u_index, "action": "DETACHED", "tagId": "tag_code", "isAlarm": false|true }]
    }]
}

// Note:
// Fields discarded from raw to SIF:
//   - data[].u_data[].old_state: Old state not needed in SIF
//
// Field transformations:
//   - gateway_sn → deviceId
//   - uuid_number → messageId
//   - data[].host_gateway_port_index → data[].moduleIndex
//   - data[].extend_module_sn → data[].moduleId
//   - data[].u_data[].u_index → data[].data[].sensorIndex
//   - data[].u_data[].tag_code → data[].data[].tagId
//
// Action field creation logic:
//   - new_state = 1, old_state = 0 → action = "ATTACHED"
//   - new_state = 0, old_state = 1 → action = "DETACHED"
//
// isAlarm field creation logic:
//   - warning = 1 → isAlarm = true
//   - warning = 0 → isAlarm = false
```

### 5. `RFID_SNAPSHOT`

**Topic:** `V6800Upload/{deviceId}/LabelState`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "u_state_resp",
  "code": "int",
  "gateway_sn": "string",
  "uuid_number": "string",
  "data": [{
      "extend_module_sn": "string",
      "host_gateway_port_index": "int",
      "u_data": [{ "u_index": "int", "u_state": "int","tag_code": "string", "warning": "int"}]
    }]
}

// Spec from Raw → SIF
{
  "meta": { "topic": "...", "rawType": "msg_type" },
  "deviceId": "gateway_sn",
  "deviceType": "V6800",
  "messageType": "RFID_SNAPSHOT",
  "messageId": "uuid_number",
  "data": [{
      "moduleIndex": host_gateway_port_index,
      "moduleId": "extend_module_sn",
      "data": [{ "sensorIndex": u_index, "tagId": "tag_code", "isAlarm": false|true }]
  }]
}

// Note:
// Fields discarded from raw to SIF:
//   - code: Response code not needed in SIF
//   - data[].u_data[].u_state: State not needed in SIF (snapshot only)
//
// Field transformations:
//   - gateway_sn → deviceId
//   - uuid_number → messageId
//   - data[].host_gateway_port_index → data[].moduleIndex
//   - data[].extend_module_sn → data[].moduleId
//   - data[].u_data[].u_index → data[].data[].sensorIndex
//   - data[].u_data[].tag_code → data[].data[].tagId
//
// isAlarm field creation logic:
//   - warning = 1 → isAlarm = true
//   - warning = 0 → isAlarm = false
```

### 6. `TEMP_HUM`

**Topic:** `V6800Upload/{deviceId}/TemHum`

**Message Format:**

```jsx
// Raw format
// Note: Device may send "temper_humidity_exception_nofity_req" (typo: "nofity" instead of "notify")
// Both spellings are accepted and mapped to TEMP_HUM messageType
{
  "msg_type": "temper_humidity_exception_notify_req",
  "gateway_sn": "string",
  "uuid_number": "string",
  "data": [
    {
      "host_gateway_port_index": "int",
      "extend_module_sn": "string",
      "th_data": [{"temper_position": "int", "temper_swot": "float",   "hygrometer_position": "int",
          "hygrometer_swot": "float"
        }]
    }]
}
// Spec from Raw → SIF
{
  "meta": { "topic": "...", "rawType": "msg_type" },
  "deviceId": "gateway_sn",
  "deviceType": "V6800",
  "messageType": "TEMP_HUM",
  "messageId": "uuid_number",
  "data": [{
      "moduleIndex": host_gateway_port_index,
      "moduleId": "extend_module_sn",
      "data": [{ "sensorIndex": temper_position, "temp": temper_swot, "hum": hygrometer_swot}]
    }]
}

// Note:
// Fields discarded from raw to SIF:
//   - None (all fields are used)
//
// Field transformations:
//   - gateway_sn → deviceId
//   - uuid_number → messageId
//   - data[].host_gateway_port_index → data[].moduleIndex
//   - data[].extend_module_sn → data[].moduleId
//   - data[].th_data[].temper_position → data[].data[].sensorIndex
//   - data[].th_data[].temper_swot → data[].data[].temp
//   - data[].th_data[].hygrometer_position → data[].data[].sensorIndex (same index)
//   - data[].th_data[].hygrometer_swot → data[].data[].hum
//
// Formatting:
//   - Format temper_swot and hygrometer_swot to float "xx.xx"
```

### 7. `QUERY_TEMP_HUM_RESP`

**Topic:** `V6800Upload/{deviceId}/TemHum`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "temper_humidity_resp",
  "code": "int",
  "gateway_sn": "string",
  "uuid_number": "string",
  "data": [{
      "extend_module_sn": "string",
      "host_gateway_port_index": "int",
      "th_data": [{"temper_position": "int","temper_swot": "float","hygrometer_position": "int", "hygrometer_swot": "float" }]
    }]
}

// Spec from Raw → SIF
{
  "meta": { "topic": "...", "rawType": "msg_type" },
  "deviceId": "gateway_sn",
  "deviceType": "V6800",
  "messageType": "QUERY_TEMP_HUM_RESP",
  "messageId": "uuid_number",
  "data": [{
      "moduleIndex": host_gateway_port_index,
      "moduleId": "extend_module_sn",
      "data": [{ "sensorIndex": temper_position, "temp": temper_swot, "hum": hygrometer_swot}]
    }]
}

// Note:
// Fields discarded from raw to SIF:
//   - code: Response code not needed in SIF
//
// Field transformations:
//   - gateway_sn → deviceId
//   - uuid_number → messageId
//   - data[].host_gateway_port_index → data[].moduleIndex
//   - data[].extend_module_sn → data[].moduleId
//   - data[].th_data[].temper_position → data[].data[].sensorIndex
//   - data[].th_data[].temper_swot → data[].data[].temp
//   - data[].th_data[].hygrometer_position → data[].data[].sensorIndex (same index)
//   - data[].th_data[].hygrometer_swot → data[].data[].hum
//
// Formatting:
//   - Format temper_swot and hygrometer_swot to float "xx.xx"
```

### 8. `DOOR_STATE_EVENT`

**Topic:** `V6800Upload/{deviceId}/Door`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "door_state_changed_notify_req",
  "gateway_sn": "string",
  "uuid_number": "string",
  "data": [{ "extend_module_sn": "string", "host_gateway_port_index": "int",  ("new_state": "int") | ("new_state1": "int",  "new_state2": "int" ) }]
}

// Spec from Raw → SIF
{
  "meta": { "topic": "...", "rawType": "msg_type" },
  "deviceId": "gateway_sn",
  "deviceType": "V6800",
  "messageType": "DOOR_STATE_EVENT",
  "messageId": "uuid_number",
  "data": [{ "moduleId": "extend_module_sn", "moduleIndex": host_gateway_port_index, "door1State": 1, "door2State": 1 }]
}

// Note:
// Fields discarded from raw to SIF:
//   - None (all fields are transformed)
//
// Field transformations:
//   - gateway_sn → deviceId
//   - uuid_number → messageId
//   - data[].extend_module_sn → data[].moduleId
//   - data[].host_gateway_port_index → data[].moduleIndex
//
// door1State and door2State unification logic:
//   - Single door sensor (has new_state field):
//     * raw.data[].new_state → sif.data[].door1State
//     * sif.data[].door2State = null
//   - Dual door sensor (has new_state1 and new_state2 fields):
//     * raw.data[].new_state1 → sif.data[].door1State
//     * raw.data[].new_state2 → sif.data[].door2State
```

### 9. `QUERY_DOOR_STATE_RESP`

**Topic:** `V6800Upload/{deviceId}/Door`

**Message Format:**

```jsx
// Raw format (single door)
{
  "msg_type": "door_state_resp",
  "code": "int",
  "gateway_port_index": "int",
  "new_state": "int",
  "uuid_number": "string"
}

// Raw format (dual door)
{
  "msg_type": "door_state_resp",
  "code": "int",
  "gateway_port_index": "int",
  "new_state1": "int",
  "new_state2": "int",
  "uuid_number": "string"
}

// Spec from Raw → SIF
{
  "meta": { "topic": "...", "rawType": "msg_type" },
  "deviceId": "Topic[1]",
  "deviceType": "V6800",
  "messageType": "QUERY_DOOR_STATE_RESP",
  "messageId": "uuid_number",
  "data": [{
    "moduleIndex": gateway_port_index,
    "door1State": new_state1,
    "door2State": new_state2
  }]
}

// Note:
// deviceId is extracted from MQTT topic: V6800Upload/{deviceId}/Door
// Example: V6800Upload/2437871205/Door → deviceId = "2437871205"
//
// Fields discarded from raw to SIF:
//   - code: Response code not needed in SIF
//   - gateway_port_index: Moved to data[].moduleIndex
//
// Field transformations:
//   - Topic[1] → deviceId
//   - uuid_number → messageId
//   - gateway_port_index → data[].moduleIndex
//
// door1State and door2State unification logic:
//   - Single door sensor (has new_state field):
//     * raw.new_state → sif.data[0].door1State
//     * sif.data[0].door2State = null
//   - Dual door sensor (has new_state1 and new_state2 fields):
//     * raw.new_state1 → sif.data[0].door1State
//     * raw.new_state2 → sif.data[0].door2State
```

### 10. `SET_COLOR_RESP`

**Topic:** `V6800Upload/{deviceId}/OpeAck`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "set_module_property_result_req",
  "set_property_type": 8001,
  "gateway_sn": "string",
  "uuid_number": "string",
  "data": [{ "host_gateway_port_index": "int", "extend_module_sn": "string", "module_type": "string", "set_property_result": "int" }]
}

// Spec from Raw → SIF
{
  "meta": { "topic": "...", "rawType": "msg_type" },
  "deviceId": "gateway_sn",
  "deviceType": "V6800",
  "messageType": "SET_COLOR_RESP",
  "messageId": "uuid_number",
  "data": [{ "moduleIndex":host_gateway_port_index, "moduleId": "extend_module_sn", "result": "Success"|"Failure" }]
}

// Note:
// Fields discarded from raw to SIF:
//   - set_property_type: Property type identifier not needed in SIF
//   - data[].module_type: Module type not needed in SIF
//
// Field transformations:
//   - gateway_sn → deviceId
//   - uuid_number → messageId
//   - data[].host_gateway_port_index → data[].moduleIndex
//   - data[].extend_module_sn → data[].moduleId
//
// result field creation logic:
//   - set_property_result = 1 → result = "Failure"
//   - set_property_result = 0 → result = "Success"
```

### 11. `QUERY_COLOR_RESP`

**Topic:** `V6800Upload/{deviceId}/OpeAck`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "u_color",
  "gateway_id": "string",
  "count": "int",
  "code": "int",
  "uuid_number": "string",
  "data": [{"index": "int", "module_id": "string", "u_num": "int",
				    "color_data": [{"index": "int", "color": "string", "code": "int" }]
    }]
}

// Spec from Raw → SIF
{
  "meta": { "topic": "...", "rawType": "msg_type" },
  "deviceId": "gateway_id",
  "deviceType": "V6800",
  "messageType": "QUERY_COLOR_RESP",
  "messageId": "uuid_number",
  "data": [{
      "moduleIndex": index,
      "moduleId": "module_id",
      "uTotal": u_num,
      "data": [{ "sensorIndex": index, "colorName": "color", "colorCode": code }]
    }]
}

// Note:
// Fields discarded from raw to SIF:
//   - code: Response code not needed in SIF (represents overall status, not per-sensor data)
//   - count: Count field not needed in SIF
//
// Field transformations:
//   - gateway_id → deviceId
//   - uuid_number → messageId
//   - data[].index → data[].moduleIndex
//   - data[].module_id → data[].moduleId
//   - data[].u_num → data[].uTotal
//   - data[].color_data[].index → data[].data[].sensorIndex
//   - data[].color_data[].color → data[].data[].colorName
//   - data[].color_data[].code → data[].data[].colorCode
```

### 12. `CLEAR_ALARM_RESP`

**Topic:** `V6800Upload/{deviceId}/OpeAck`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "clear_u_warning",
  "gateway_id": "string",
  "count": "int",
  "code": "int",
  "uuid_number": "string",
  "data": [{ "index": "int", "module_id": "string", "u_num": "int", "ctr_flag": "bool" }]
}

// Spec from Raw → SIF
{
  "meta": { "topic": "...", "rawType": "msg_type" },
  "deviceId": "gateway_id",
  "deviceType": "V6800",
  "messageType": "CLEAR_ALARM_RESP",
  "messageId": "uuid_number",
  "data": [{ "moduleIndex": index, "moduleId": "module_id", "uTotal": u_num, "result": "Success"|"Failure" }]
}

// Note:
// Fields discarded from raw to SIF:
//   - count: Count field not needed in SIF
//   - code: Response code not needed in SIF
//   - data[].ctr_flag: Control flag transformed to result field
//
// Field transformations:
//   - gateway_id → deviceId
//   - uuid_number → messageId
//   - data[].index → data[].moduleIndex
//   - data[].module_id → data[].moduleId
//   - data[].u_num → data[].uTotal
//
// result field creation logic:
//   - ctr_flag = true → result = "Success"
//   - ctr_flag = false → result = "Failure"
```

## Part#2 Query or Set Command Messages (App → Broker → Device)

### 2.1 `QUERY_DEV_MOD_INFO`

**Topic:** `V6800Download/{deviceId}`

**Message Format:**

```jsx
// Raw
{
  "msg_type": "get_devies_init_req",
  "msg_code": 200
}

// SIF
{
  "deviceId": "2437871205",
  "deviceType": "V6800",
  "messageType": "QUERY_DEV_MOD_INFO",
  "data": {}
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data: Empty data object not sent in raw message
//
// Field transformations:
//   - deviceId → Not used (extracted from topic in middleware)
//   - messageType "QUERY_DEV_MOD_INFO" → msg_type "get_devies_init_req"
//   - msg_code = 200 (fixed value)
```

### 2.2 `QUERY_RFID_SNAPSHOT`

**Topic:** `V6800Download/{deviceId}`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "u_state_req",
  "gateway_sn": "string",
  "data": [{"extend_module_sn": null, "host_gateway_port_index": 4, "u_index_list": null}]
}

// SIF
{
  "deviceId": "2437871205",
  "deviceType": "V6800",
  "messageType": "QUERY_RFID_SNAPSHOT",
  "data": {"moduleIndex": 4}
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data.moduleId: Not sent (extend_module_sn set to null)
//   - data.sensorIndex: Not sent (u_index_list set to null)
//
// Field transformations:
//   - deviceId → gateway_sn
//   - data.moduleIndex → data[].host_gateway_port_index
//   - messageType "QUERY_RFID_SNAPSHOT" → msg_type "u_state_req"
//   - data[].extend_module_sn = null
//   - data[].u_index_list = null
```

### 2.3 `QUERY_DOOR_STATE`

**Topic:** `V6800Download/{deviceId}`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "door_state_req",
  "gateway_sn": "string",
  "extend_module_sn": "string",
  "host_gateway_port_index": 4
}

// SIF Format
{
  "deviceId": "2437871205",
  "deviceType": "V6800",
  "messageType": "QUERY_DOOR_STATE",
  "data": {"moduleIndex": 4}
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data.moduleId: Not sent (extend_module_sn set to null)
//
// Field transformations:
//   - deviceId → gateway_sn
//   - data.moduleIndex → host_gateway_port_index
//   - messageType "QUERY_DOOR_STATE" → msg_type "door_state_req"
//   - extend_module_sn = null
```

### 2.4 `QUERY_TEMP_HUM`

**Topic:** `V6800Download/{deviceId}`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "temper_humidity_req",
  "gateway_sn": "string",
  "extend_module_sn": null,
  "data": [4]
}

// SIF format
{
  "deviceId": "2437871205",
  "deviceType": "V6800",
  "messageType": "QUERY_TEMP_HUM",
  "data": {"moduleIndex": 4}
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data.moduleId: Not sent (extend_module_sn set to null)
//
// Field transformations:
//   - deviceId → gateway_sn
//   - data.moduleIndex → data[0] (array of port indices)
//   - messageType "QUERY_TEMP_HUM" → msg_type "temper_humidity_req"
//   - extend_module_sn = null
//   - data = [moduleIndex] (array format)
```

### 2.5 `SET_COLOR`

**Topic:** `V6800Download/{deviceId}`

**Message Format:**

```jsx
//raw
{
  "msg_type" : "set_module_property_req",
  "gateway_sn" : "2437871205",
  "set_property_type" : 8001,
  "data" : [ {
    "host_gateway_port_index" : 1,
    "extend_module_sn" : null,
    "module_type" : 2,
    "u_color_data" : [ {"u_index" : 10, "color_code" : 1} ]
  } ]
}

// SIF
{
  "deviceId": "2437871205",
  "deviceType": "V6800",
  "messageType": "SET_COLOR",
  "data": {
    "moduleIndex": 1,
    "sensorIndex": 10,
    "colorCode": 1
  }
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data.moduleId: Not sent (extend_module_sn set to null)
//
// Field transformations:
//   - deviceId → gateway_sn
//   - data.moduleIndex → data[].host_gateway_port_index
//   - data.sensorIndex → data[].u_color_data[].u_index
//   - data.colorCode → data[].u_color_data[].color_code
//   - messageType "SET_COLOR" → msg_type "set_module_property_req"
//   - set_property_type = 8001 (fixed value)
//   - module_type = 2 (fixed value)
//   - extend_module_sn = null
```

### 2.6 `QUERY_COLOR`

**Topic:** `V6800Download/{deviceId}`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "get_u_color",
  "code": "int",
  "data": [4]
}
// SIF format
{
  "deviceId": "2437871205",
  "deviceType": "V6800",
  "messageType": "QUERY_COLOR",
  "data": {"moduleIndex": 4 }
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//   - data.sensorIndex: Not sent in raw message
//
// Field transformations:
//   - deviceId → Not used (extracted from topic in middleware)
//   - data.moduleIndex → data[0] (array of port indices)
//   - messageType "QUERY_COLOR" → msg_type "get_u_color"
//   - code = 0 (default value, may vary)
//   - data = [moduleIndex] (array format)
```

### 2.7 `CLEAR_ALARM`

**Topic:** `V6800Download/{deviceId}`

**Message Format:**

```jsx
// Raw format
{
  "msg_type": "clear_u_warning",
  "code": "int",
  "data": [{"index": 4, "warning_data": [10]}]
}

// SIF format
{
  "deviceId": "2437871205",
  "deviceType": "V6800",
  "messageType": "CLEAR_ALARM",
  "data": {"moduleIndex": 4, "sensorIndex": 10}
}

// Note:
// Fields discarded from SIF to Raw:
//   - deviceType: Device type not sent in raw message
//   - messageType: Message type not sent in raw message
//
// Field transformations:
//   - deviceId → Not used (extracted from topic in middleware)
//   - data.moduleIndex → data[].index
//   - data.sensorIndex → data[].warning_data[0]
//   - messageType "CLEAR_ALARM" → msg_type "clear_u_warning"
//   - code = 0 (default value, may vary)
//   - data[].warning_data = [sensorIndex] (array format)
```

## Part#3 Data Type and Encoding Specifications

### 3.1 Timestamp Format

All timestamp fields (when present) MUST use the following ISO8601 format:

```
YYYY-MM-DDTHH:mm:ss.sssZ
```

**Examples:**

- `2026-02-25T10:30:00.000Z`
- `2026-02-25T10:30:45.123Z`

**Requirements:**

- Always include milliseconds (`.sss`)
- Always use UTC timezone (`Z` suffix)
- Do not use timezone offsets (e.g., `+08:00`)

**Note:** V6800 raw JSON messages do not include timestamp fields. Timestamps are added by the middleware during SIF transformation.

### 3.2 Byte Order

**Not Applicable:** V6800 uses JSON protocol, which does not involve binary multi-byte integer fields. All numeric values are represented as JSON numbers or strings.

### 3.3 String Encoding

- **JSON strings (both raw and SIF):** UTF-8 encoding
- **Hex strings:** ASCII characters (0-9, A-F), uppercase
- **Device IDs:** String representation (may be numeric or alphanumeric)
- **MAC addresses:** Hex string with colons (e.g., `AA:BB:CC:DD:EE:FF`)
- **IP addresses:** Dot-notation string (e.g., `192.168.0.1`)
- **UUID strings:** Standard UUID format (e.g., `550e8400-e29b-41d4-a716-446655440000`)

### 3.4 Empty Array vs Null Handling

**Rule:** Use explicit `null` for optional fields that have no value. Use empty array `[]` for successfully parsed data with no items.

**Examples:**

- Module has no RFID tags: `"data": []` (empty array)
- Single-door module has no second door: `"door2State": null` (explicit null)
- Parsing error or field not applicable: Omit field entirely or use `null`

**Specific Cases:**

- `door2State`: Always include as `null` for single-door modules
- Empty sensor data: `"data": []` (empty array)
- Missing optional field: Use `null` or omit entirely

---

## Part#4 Error Handling

This section defines how the parser should handle various error conditions for V6800 JSON messages.

### 4.1 JSON Parsing Failures

**Scenario:** Raw message cannot be parsed as valid JSON.

**Handling:**

- Log error with raw message payload (truncated if too long)
- Discard the message
- Do not attempt to parse further

**Example:**

```
ERROR: Failed to parse JSON: Unexpected token < in position 0
Raw: <html>Not JSON</html>
```

### 4.2 Unknown Message Type

**Scenario:** `msg_type` field does not match any known message type.

**Handling:**

- Log warning with device ID and unknown msg_type
- Discard the message
- Do not attempt to parse

**Example:**

```
WARN: Unknown msg_type 'unknown_message_type' for device 2437871205
```

### 4.3 Missing Required Fields

**Scenario:** Required field is missing from the raw JSON message.

**Required Fields (varies by message type):**

- All messages: `msg_type`, `uuid_number` (or `gateway_sn`/`gateway_id`)
- Most messages: `data` array

**Handling:**

- Log error with message type and missing field name
- Discard the message
- Do not attempt to create partial SIF

**Example:**

```
ERROR: Missing required field 'uuid_number' in HEARTBEAT message
```

### 4.4 Invalid Data Types

**Scenario:** Field value does not match expected data type.

**Examples:**

- Numeric field contains string: `"module_index": "not_a_number"`
- Boolean field contains integer: `"ctr_flag": 1` (should be `true`/`false`)
- Array field contains object: `"data": {}` (should be `[]`)

**Handling:**

- Log warning with device ID, field name, and invalid value
- Set field to `null` in SIF
- Continue processing other fields

**Example:**

```
WARN: Invalid data type for 'module_index' (expected int, got string), setting to null
```

### 4.5 Out of Range Values

**Scenario:** Numeric value is outside expected range.

**Valid Ranges:**

- `module_index`: 1-255 (varies by device capability)
- `sensorIndex`: 1-54 for RFID, 10-15 for temp, 16-18 for noise
- `temper_swot` (temperature): -50 to 100 (°C)
- `hygrometer_swot` (humidity): 0 to 100 (%)
- `set_property_result`: 0 or 1
- `ctr_flag`: true or false

**Handling:**

- Log warning with device ID, field name, and invalid value
- Set field to `null` in SIF
- Continue processing other fields

**Example:**

```
WARN: Invalid temperature value 150.00°C for device 2437871205 (valid range: -50 to 100), setting to null
```

### 4.6 Invalid Topic Format

**Scenario:** MQTT topic does not match expected pattern.

**Expected Patterns:**

- `V6800Upload/{deviceId}/Init`
- `V6800Upload/{deviceId}/DeviceChange`
- `V6800Upload/{deviceId}/HeartBeat`
- `V6800Upload/{deviceId}/LabelState`
- `V6800Upload/{deviceId}/TemHum`
- `V6800Upload/{deviceId}/Door`
- `V6800Upload/{deviceId}/OpeAck`
- `V6800Download/{deviceId}`

**Handling:**

- Log warning with actual topic string
- Discard the message
- Do not attempt to parse

**Example:**

```
WARN: Invalid topic format: V6800Upload/2437871205/Unknown
```

### 4.7 Duplicate messageId

**Scenario:** Same `uuid_number` received multiple times from the same device.

**Handling:**

- Log info message with device ID and messageId
- Process the message normally (duplicate messages may be retransmissions)
- Application layer can implement deduplication if needed

**Example:**

```
INFO: Duplicate messageId 550e8400-e29b-41d4-a716-446655440000 from device 2437871205
```

### 4.8 Empty or Null Data Array

**Scenario:** `data` array is empty (`[]`) or `null`.

**Handling:**

- This is NOT an error - it's a valid indicator of no data
- Include `"data": []` in SIF (empty array)
- No logging required

**Example:** Device sends heartbeat with no modules connected.

### 4.9 Invalid UUID Format

**Scenario:** `uuid_number` field does not match valid UUID format.

**Valid Format:** Standard UUID (e.g., `550e8400-e29b-41d4-a716-446655440000`)

**Handling:**

- Log warning with device ID and invalid UUID
- Discard the message (UUID is required for correlation)
- Do not attempt to parse

**Example:**

```
WARN: Invalid UUID format 'not-a-uuid' for device 2437871205
```

### 4.10 Null or Missing Optional Fields

**Scenario:** Optional field is `null` or missing from raw message.

**Handling:**

- This is NOT an error - optional fields may be absent
- Set corresponding SIF field to `null`
- No logging required

**Example:** `extend_module_sn` is `null` in query requests.

### 4.11 Malformed IP Address

**Scenario:** IP address field does not match valid IPv4 format.

**Valid Format:** Dot-notation (e.g., `192.168.0.1`)

**Handling:**

- Log warning with device ID and invalid IP address
- Set field to `null` in SIF
- Continue processing other fields

**Example:**

```
WARN: Invalid IP address '256.168.0.1' for device 2437871205, setting to null
```

### 4.12 Malformed MAC Address

**Scenario:** MAC address field does not match valid format.

**Valid Formats:**

- With colons: `AA:BB:CC:DD:EE:FF`
- Without colons: `AABBCCDDEEFF` (will be converted to colon format)

**Handling:**

- Log warning with device ID and invalid MAC address
- Set field to `null` in SIF
- Continue processing other fields

**Example:**

```
WARN: Invalid MAC address 'ZZ:BB:CC:DD:EE:FF' for device 2437871205, setting to null
```

### 4.13 Array Index Out of Bounds

**Scenario:** Attempting to access array element that doesn't exist.

**Example:** Accessing `data[5]` when array has only 3 elements.

**Handling:**

- Log error with message type and array index
- Skip that array element
- Continue processing other elements

**Example:**

```
ERROR: Array index out of bounds (index 5, length 3) in RFID_SNAPSHOT
```

### 4.14 Typo in msg_type Field

**Scenario:** Device sends message with typo in `msg_type` field.

**Known Typos (Accepted):**

- `temper_humidity_exception_nofity_req` → should be `temper_humidity_exception_notify_req`
  - Both spellings are accepted and mapped to TEMP_HUM messageType

**Handling:**

- Log info message with device ID and corrected typo
- Process message normally with corrected msg_type

**Example:**

```
INFO: Corrected typo in msg_type 'temper_humidity_exception_nofity_req' to 'temper_humidity_exception_notify_req'
```

### 4.15 Inconsistent Field Names

**Scenario:** Message uses different field names for same concept (e.g., `gateway_sn` vs `gateway_id`).

**Handling:**

- This is documented behavior - different messages use different field names
- Map field names correctly according to message type specification
- No logging required

**Example:** `HEARTBEAT` uses `module_sn` for deviceId, while other messages use `gateway_sn`.

---

## Note

- `{deviceId}`: Replace with the actual global unique ID of the V6800 Device.
- Data type description: `string` (character string), `int` (integer), `float` (floating point number), `array` (array), `bool` (boolean: true/false).
- The fields with no actual value in the message can be filled with `null` according to the business scenario.

## Field Naming Convention

**Note:** Raw message fields use snake_case (e.g., `module_sn`, `u_index`) while SIF fields use camelCase (e.g., `moduleId`, `sensorIndex`). This transformation is intentional for consistency.

## Data Type Handling

- If a raw field is `null` or missing, set the corresponding SIF field to `null`
- String fields: Trim whitespace and validate format
- Numeric fields: Validate range and convert to appropriate type
- Boolean fields: Convert integer `0`/`1` to `false`/`true`
