# V6800 Real Test Messages

This file contains real V6800 device messages for end-to-end testing.
Each test case includes the raw JSON input and expected SIF/SUO outputs.

---

## Test Case 1: HEARTBEAT

**Description:** Device heartbeat with power status and module list
**Topic:** V6800Upload/2123456789/HeartBeat

### Raw Input (JSON)

```json
{
  "msg_type": "heart_beat_req",
  "module_type": "mt_gw",
  "module_sn": "2123456789",
  "bus_V": "23.89",
  "bus_I": "5.40",
  "main_power": 1,
  "backup_power": 0,
  "uuid_number": 448817932,
  "data": [
    {
      "module_index": 4,
      "module_sn": "1134666004",
      "module_m_num": 1,
      "module_u_num": 6
    }
  ]
}
```

### Expected SIF Output

```json
{
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "messageType": "HEARTBEAT",
  "messageId": "448817932",
  "meta": {
    "topic": "V6800Upload/2123456789/HeartBeat",
    "rawType": "heart_beat_req",
    "busVoltage": "23.89",
    "busCurrent": "5.40",
    "mainPower": 1,
    "backupPower": 0
  },
  "data": [
    {
      "moduleIndex": 4,
      "moduleId": "1134666004",
      "uTotal": 6
    }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_HEARTBEAT",
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "messageId": "448817932",
  "meta": {
    "busVoltage": "23.89",
    "busCurrent": "5.40",
    "mainPower": 1,
    "backupPower": 0
  },
  "modules": [
    {
      "moduleIndex": 4,
      "moduleId": "1134666004",
      "uTotal": 6
    }
  ]
}
```

---

## Test Case 2: QUERY_DOOR_STATE_RESP

**Description:** Query door state response - door closed
**Topic:** V6800Upload/2123456789/Door

### Raw Input (JSON)

```json
{
  "msg_type": "door_state_resp",
  "code": 200,
  "host_gateway_port_index": 4,
  "extend_module_sn": "1134666004",
  "new_state": 0,
  "uuid_number": 338105664
}
```

### Expected SIF Output

```json
{
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "messageType": "QUERY_DOOR_STATE_RESP",
  "messageId": "338105664",
  "meta": {
    "topic": "V6800Upload/2123456789/Door",
    "rawType": "door_state_resp"
  },
  "data": [
    {
      "moduleIndex": 0,
      "door1State": 0,
      "door2State": null
    }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_DOOR_STATE",
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "moduleIndex": 0,
  "moduleId": "",
  "messageId": "338105664",
  "door1State": 0,
  "door2State": null,
  "data": {}
}
```

---

## Test Case 3: DOOR_STATE_EVENT

**Description:** Door state change event - door opened
**Topic:** V6800Upload/2123456789/Door

### Raw Input (JSON)

```json
{
  "msg_type": "door_state_changed_notify_req",
  "gateway_sn": "2123456789",
  "uuid_number": 440530492,
  "data": [
    {
      "extend_module_sn": "1134666004",
      "host_gateway_port_index": 4,
      "new_state": 1
    }
  ]
}
```

### Expected SIF Output

```json
{
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "messageType": "DOOR_STATE_EVENT",
  "messageId": "440530492",
  "meta": {
    "topic": "V6800Upload/2123456789/Door",
    "rawType": "door_state_changed_notify_req"
  },
  "data": [
    {
      "moduleId": "1134666004",
      "moduleIndex": 4,
      "door1State": 1,
      "door2State": null
    }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_DOOR_STATE",
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "moduleIndex": 4,
  "moduleId": "1134666004",
  "messageId": "440530492",
  "door1State": 1,
  "door2State": null,
  "data": {}
}
```

---

## Test Case 4: RFID_SNAPSHOT

**Description:** RFID snapshot with 6 slots - 2 tags present, 4 empty
**Topic:** V6800Upload/2123456789/LabelState

### Raw Input (JSON)

```json
{
  "msg_type": "u_state_resp",
  "code": 200,
  "gateway_sn": "2123456789",
  "uuid_number": 1912381473,
  "data": [
    {
      "host_gateway_port_index": 4,
      "extend_module_sn": "1134666004",
      "u_data": [
        { "u_index": 6, "u_state": 0, "tag_code": null, "warning": 0 },
        { "u_index": 5, "u_state": 0, "tag_code": null, "warning": 0 },
        { "u_index": 4, "u_state": 0, "tag_code": null, "warning": 0 },
        { "u_index": 3, "u_state": 0, "tag_code": null, "warning": 0 },
        { "u_index": 2, "u_state": 1, "tag_code": "DD3698A4", "warning": 0 },
        { "u_index": 1, "u_state": 1, "tag_code": "DD395064", "warning": 0 }
      ]
    }
  ]
}
```

### Expected SIF Output

```json
{
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "messageType": "RFID_SNAPSHOT",
  "messageId": "1912381473",
  "meta": {
    "topic": "V6800Upload/2123456789/LabelState",
    "rawType": "u_state_resp"
  },
  "data": [
    {
      "moduleIndex": 4,
      "moduleId": "1134666004",
      "data": [
        { "sensorIndex": 6, "tagId": null, "isAlarm": false },
        { "sensorIndex": 5, "tagId": null, "isAlarm": false },
        { "sensorIndex": 4, "tagId": null, "isAlarm": false },
        { "sensorIndex": 3, "tagId": null, "isAlarm": false },
        { "sensorIndex": 2, "tagId": "DD3698A4", "isAlarm": false },
        { "sensorIndex": 1, "tagId": "DD395064", "isAlarm": false }
      ]
    }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_RFID_SNAPSHOT",
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "moduleIndex": 4,
  "moduleId": "1134666004",
  "messageId": "1912381473",
  "data": {
    "sensors": [
      { "sensorIndex": 6, "tagId": null, "isAlarm": false },
      { "sensorIndex": 5, "tagId": null, "isAlarm": false },
      { "sensorIndex": 4, "tagId": null, "isAlarm": false },
      { "sensorIndex": 3, "tagId": null, "isAlarm": false },
      { "sensorIndex": 2, "tagId": "DD3698A4", "isAlarm": false },
      { "sensorIndex": 1, "tagId": "DD395064", "isAlarm": false }
    ]
  }
}
```

---

## Test Case 5: RFID_EVENT

**Description:** RFID attach event - 2 tags attached simultaneously
**Topic:** V6800Upload/2123456789/LabelState

### Raw Input (JSON)

```json
{
  "msg_type": "u_state_changed_notify_req",
  "gateway_sn": "2123456789",
  "uuid_number": 1277164225,
  "data": [
    {
      "host_gateway_port_index": 4,
      "extend_module_sn": "1134666004",
      "u_data": [
        { "u_index": 2, "new_state": 1, "old_state": 0, "tag_code": "DD3698A4", "warning": 0 },
        { "u_index": 1, "new_state": 1, "old_state": 0, "tag_code": "DD395064", "warning": 0 }
      ]
    }
  ]
}
```

### Expected SIF Output

```json
{
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "messageType": "RFID_EVENT",
  "messageId": "1277164225",
  "meta": {
    "topic": "V6800Upload/2123456789/LabelState",
    "rawType": "u_state_changed_notify_req"
  },
  "data": [
    {
      "moduleIndex": 4,
      "moduleId": "1134666004",
      "data": [
        { "sensorIndex": 2, "action": "ATTACHED", "tagId": "DD3698A4", "isAlarm": false },
        { "sensorIndex": 1, "action": "ATTACHED", "tagId": "DD395064", "isAlarm": false }
      ]
    }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_RFID_EVENT",
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "moduleIndex": 4,
  "moduleId": "1134666004",
  "messageId": "1277164225",
  "data": {
    "events": [
      { "sensorIndex": 2, "action": "ATTACHED", "tagId": "DD3698A4", "isAlarm": false },
      { "sensorIndex": 1, "action": "ATTACHED", "tagId": "DD395064", "isAlarm": false }
    ]
  }
}
```

---

## Test Case 6: DEV_MOD_INFO

**Description:** Device initialization with module information
**Topic:** V6800Upload/2123456789/Init

### Raw Input (JSON)

```json
{
  "msg_type": "devies_init_req",
  "gateway_sn": "2123456789",
  "gateway_ip": "192.168.100.212",
  "gateway_mac": "08:80:7E:91:61:15",
  "uuid_number": 284392567,
  "data": [
    {
      "module_type": "mt_ul",
      "module_index": 4,
      "module_sn": "1134666004",
      "module_m_num": 1,
      "module_u_num": 6,
      "module_sw_version": "2307101644",
      "module_supplier": "Digitalor",
      "module_brand": "Digitalor",
      "module_model": "Digitalor"
    }
  ]
}
```

### Expected SIF Output

```json
{
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "messageType": "DEV_MOD_INFO",
  "messageId": "284392567",
  "meta": {
    "topic": "V6800Upload/2123456789/Init",
    "rawType": "devies_init_req"
  },
  "ip": "192.168.100.212",
  "mac": "08:80:7E:91:61:15",
  "data": [
    {
      "moduleIndex": 4,
      "moduleId": "1134666004",
      "fwVer": "2307101644",
      "uTotal": 6
    }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_DEV_MOD",
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "messageId": "284392567",
  "ip": "192.168.100.212",
  "mask": null,
  "gwIp": null,
  "mac": "08:80:7E:91:61:15",
  "model": null,
  "fwVer": null,
  "modules": [
    {
      "moduleIndex": 4,
      "moduleId": "1134666004",
      "fwVer": "2307101644",
      "uTotal": 6
    }
  ]
}
```

---

## Test Case 7: MOD_CHNG_EVENT

**Description:** Module change event - configuration updated
**Topic:** V6800Upload/2123456789/DeviceChange

### Raw Input (JSON)

```json
{
  "msg_type": "devices_changed_req",
  "gateway_sn": "2123456789",
  "uuid_number": 343548517,
  "data": [
    {
      "module_type": "mt_ul",
      "module_index": 4,
      "module_sn": "1134666004",
      "module_m_num": 2,
      "module_u_num": 12,
      "module_sw_version": "2307101644",
      "module_supplier": "Digitalor",
      "module_brand": "Digitalor",
      "module_model": "Digitalor"
    }
  ]
}
```

### Expected SIF Output

```json
{
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "messageType": "MOD_CHNG_EVENT",
  "messageId": "343548517",
  "meta": {
    "topic": "V6800Upload/2123456789/DeviceChange",
    "rawType": "devices_changed_req"
  },
  "data": [
    {
      "moduleIndex": 4,
      "moduleId": "1134666004",
      "fwVer": "2307101644",
      "uTotal": 12
    }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_DEV_MOD",
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "messageId": "343548517",
  "ip": null,
  "mask": null,
  "gwIp": null,
  "mac": null,
  "model": null,
  "fwVer": null,
  "modules": [
    {
      "moduleIndex": 4,
      "moduleId": "1134666004",
      "fwVer": "2307101644",
      "uTotal": 12
    }
  ]
}
```

---

## Test Case 8: QUERY_TEMP_HUM_RESP

**Description:** Query temperature and humidity response - 2 sensors
**Topic:** V6800Upload/2123456789/TemHum

### Raw Input (JSON)

```json
{
  "msg_type": "temper_humidity_resp",
  "code": 200,
  "gateway_sn": "2123456789",
  "uuid_number": 1156421679,
  "data": [
    {
      "host_gateway_port_index": 4,
      "extend_module_sn": "1134666004",
      "th_data": [
        {
          "temper_position": 10,
          "hygrometer_position": 10,
          "temper_swot": 27,
          "hygrometer_swot": 53.70000076293945
        },
        {
          "temper_position": 11,
          "hygrometer_position": 11,
          "temper_swot": 27.799999237060547,
          "hygrometer_swot": 51.0999984741211
        }
      ]
    }
  ]
}
```

### Expected SIF Output

```json
{
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "messageType": "QUERY_TEMP_HUM_RESP",
  "messageId": "1156421679",
  "meta": {
    "topic": "V6800Upload/2123456789/TemHum",
    "rawType": "temper_humidity_resp"
  },
  "data": [
    {
      "moduleIndex": 4,
      "moduleId": "1134666004",
      "data": [
        { "sensorIndex": 10, "temp": 27, "hum": 53.70000076293945 },
        { "sensorIndex": 11, "temp": 27.799999237060547, "hum": 51.0999984741211 }
      ]
    }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_TEMP_HUM",
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "moduleIndex": 4,
  "moduleId": "1134666004",
  "messageId": "1156421679",
  "data": {
    "sensors": [
      { "sensorIndex": 10, "temp": 27, "hum": 53.70000076293945 },
      { "sensorIndex": 11, "temp": 27.799999237060547, "hum": 51.0999984741211 }
    ]
  }
}
```

---

## Test Case 9: TEMP_HUM

**Description:** Temperature and humidity exception notification - 6 sensors (2 active, 4 empty)
**Topic:** V6800Upload/2123456789/TemHum
**Note:** Device firmware has typo "temper_humidity_exception_nofity_req" (missing 'i')

### Raw Input (JSON)

```json
{
  "msg_type": "temper_humidity_exception_nofity_req",
  "gateway_sn": "2123456789",
  "uuid_number": 572477555,
  "data": [
    {
      "host_gateway_port_index": 4,
      "extend_module_sn": "1134666004",
      "th_data": [
        {
          "temper_position": 10,
          "hygrometer_position": 10,
          "temper_swot": 26.899999618530273,
          "hygrometer_swot": 54.0999984741211
        },
        {
          "temper_position": 11,
          "hygrometer_position": 11,
          "temper_swot": 27.600000381469727,
          "hygrometer_swot": 52.4000015258789
        },
        {
          "temper_position": 12,
          "hygrometer_position": 12,
          "temper_swot": 0,
          "hygrometer_swot": 0
        },
        {
          "temper_position": 13,
          "hygrometer_position": 13,
          "temper_swot": 0,
          "hygrometer_swot": 0
        },
        {
          "temper_position": 14,
          "hygrometer_position": 14,
          "temper_swot": 0,
          "hygrometer_swot": 0
        },
        {
          "temper_position": 15,
          "hygrometer_position": 15,
          "temper_swot": 0,
          "hygrometer_swot": 0
        }
      ]
    }
  ]
}
```

### Expected SIF Output

```json
{
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "messageType": "TEMP_HUM",
  "messageId": "572477555",
  "meta": {
    "topic": "V6800Upload/2123456789/TemHum",
    "rawType": "temper_humidity_exception_nofity_req"
  },
  "data": [
    {
      "moduleIndex": 4,
      "moduleId": "1134666004",
      "data": [
        { "sensorIndex": 10, "temp": 26.899999618530273, "hum": 54.0999984741211 },
        { "sensorIndex": 11, "temp": 27.600000381469727, "hum": 52.4000015258789 },
        { "sensorIndex": 12, "temp": 0, "hum": 0 },
        { "sensorIndex": 13, "temp": 0, "hum": 0 },
        { "sensorIndex": 14, "temp": 0, "hum": 0 },
        { "sensorIndex": 15, "temp": 0, "hum": 0 }
      ]
    }
  ]
}
```

### Expected SUO Output

```json
{
  "suoType": "SUO_TEMP_HUM",
  "deviceType": "V6800",
  "deviceId": "2123456789",
  "moduleIndex": 4,
  "moduleId": "1134666004",
  "messageId": "572477555",
  "data": {
    "sensors": [
      { "sensorIndex": 10, "temp": 26.899999618530273, "hum": 54.0999984741211 },
      { "sensorIndex": 11, "temp": 27.600000381469727, "hum": 52.4000015258789 },
      { "sensorIndex": 12, "temp": 0, "hum": 0 },
      { "sensorIndex": 13, "temp": 0, "hum": 0 },
      { "sensorIndex": 14, "temp": 0, "hum": 0 },
      { "sensorIndex": 15, "temp": 0, "hum": 0 }
    ]
  }
}
```

---

## Summary

| Test # | Message Type          | Topic        | Key Validation Points                                |
| ------ | --------------------- | ------------ | ---------------------------------------------------- |
| 1      | HEARTBEAT             | HeartBeat    | Power status (bus_V, bus_I, main_power), module list |
| 2      | QUERY_DOOR_STATE_RESP | Door         | Single door state query response                     |
| 3      | DOOR_STATE_EVENT      | Door         | Door state change notification                       |
| 4      | RFID_SNAPSHOT         | LabelState   | Full RFID snapshot with empty slots                  |
| 5      | RFID_EVENT            | LabelState   | Tag attach events with old/new state                 |
| 6      | DEV_MOD_INFO          | Init         | Device initialization with network info              |
| 7      | MOD_CHNG_EVENT        | DeviceChange | Module configuration change                          |
| 8      | QUERY_TEMP_HUM_RESP   | TemHum       | Temperature/humidity query response                  |
| 9      | TEMP_HUM              | TemHum       | Exception notification with typo handling            |

## Notes for Test Implementation

1. **JSON Parsing**: V6800 messages are JSON strings, not binary buffers
2. **Message Type Mapping**: Uses msg_type field to determine message type
3. **Typo Handling**: `temper_humidity_exception_nofity_req` (missing 'i' in 'notify') is a known device firmware typo
4. **Flattening**: V6800 normalizer flattens arrays into individual SUO messages per module
5. **Sensor Data**: Both temp/hum sensors use same position index (temper_position = hygrometer_position)
6. **Action Mapping**: `new_state` 1=ATTACHED, 0=DETACHED for RFID events
