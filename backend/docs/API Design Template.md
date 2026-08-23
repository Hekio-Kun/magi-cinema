[TOC]

---
## Overview

## API Specification

| API        | URL             |
| ---------- | --------------- |
| POST       | /api/auth/login |
| Permission | N/A             |

## Request sample
```json
{
    "userName": "userName",
    "password": "password"
}
```

| Field    | Description                         | Data Type | Examples   |
| -------- | ----------------------------------- | --------- | ---------- |
| userName | The user name account need to login | string    | `userName` |
| password | The password of user name account   | string    | `password` |

## Response sample

```json
{
  "result": {
    "accessToken": "",
    "refreshToken": ""
  },
  "isSuccess": true,
  "statusCode": 200,
  "message": "Sign in successfully"
}
```

## Validation 

<table>
    <th>Status code</th>
    <th>Description</th>
    <th>Examples</th>
    <tbody>
        <tr>
            <td>400</td>
            <td>The user name is missing</td>
<td>

```json
{
  "result": null,
  "isSuccess": false,
  "statusCode": 400,
  "message": "userName is missing."
}
```
</td>
        </tr>
        <tr>
            <td>400</td>
            <td>The password is missing</td>
<td>

```json
{
  "result": null,
  "isSuccess": false,
  "statusCode": 400,
  "message": "password is missing."
}
```
</td>
        </tr>
                <tr>
            <td>400</td>
            <td>The incorrect user name or password</td>
<td>

```json
{
  "result": null,
  "isSuccess": false,
  "statusCode": 400,
  "message": "Incorrect username or password. Try again."
}
```
</td>
        </tr>
    </tbody>
</table>

## Activity Diagram

```plantuml
@startuml
start
:User input username and password;
:User click the Login button;
if (Fail validation) then
  :Show the error message;
  :Login fail;
else
  :Return the results;
  :Login successfully;
endif
stop
@enduml
```

## Sequence Diagram

```plantuml
@startuml
actor User as user
participant Controller as controller
participant LoginService as service
participant Database as db

user -> controller: Call Login API
controller -> service: Handle the request
service -> service: Validate the request
alt If wrong validation
  service --> controller: Return error message.
  controller --> user: Display error message.
end
service -> service: Generate Login Token.
service -> db: Save Token and set Expire Time.
db --> service: Return results.
service --> controller: Return result.
controller --> user: Login successfully.
@enduml
```