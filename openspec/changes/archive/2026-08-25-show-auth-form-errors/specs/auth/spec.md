## ADDED Requirements

### Requirement: Authentication form error display

The login and registration forms MUST display a Russian-language error message when an authentication request fails, so the user can understand why the request was rejected. The message MUST be selected by a fixed mapping from the server response `error.code` field to Russian text: `UNAUTHORIZED` → «Неверный email или пароль», `CONFLICT` → «Пользователь с таким email уже существует», `VALIDATION_ERROR` → «Проверьте правильность введённых данных», `INTERNAL_ERROR` → «Внутренняя ошибка сервера, попробуйте позже». For a network failure (no HTTP response) or an unknown/missing code the forms MUST display the fallback message «Что-то пошло не так, попробуйте позже». The raw English `error.message` from the server MUST NOT be shown to the user. Form field validation errors (client-side) MUST remain separate from server errors and MUST be displayed in Russian (e.g. malformed email, password shorter than required, passwords don't match).

#### Scenario: Login with wrong password

- **WHEN** user submits the login form with correct email but an incorrect password and the server responds 401 with `error.code` "UNAUTHORIZED"
- **THEN** the login form displays the error message «Неверный email или пароль»
- **AND** the form remains filled in so the user can correct the password and resubmit

#### Scenario: Login with unregistered email

- **WHEN** user submits the login form with an email that has no account and the server responds 401 with `error.code` "UNAUTHORIZED"
- **THEN** the login form displays the same message «Неверный email или пароль» (the UI does not reveal whether the email exists)

#### Scenario: Registration with existing email

- **WHEN** user submits the registration form with an email that is already registered and the server responds 409 with `error.code` "CONFLICT"
- **THEN** the registration form displays the error message «Пользователь с таким email уже существует»

#### Scenario: Registration with weak or malformed input

- **WHEN** user submits the registration form with data the server rejects with 400 and `error.code` "VALIDATION_ERROR"
- **THEN** the registration form displays the error message «Проверьте правильность введённых данных»

#### Scenario: Server error

- **WHEN** the login or registration request fails with a 5xx response carrying `error.code` "INTERNAL_ERROR"
- **THEN** the form displays the error message «Внутренняя ошибка сервера, попробуйте позже»

#### Scenario: Network error or unknown code

- **WHEN** the login or registration request fails without an HTTP response (network failure) or with a response whose `error.code` is missing or not in the mapping
- **THEN** the form displays the fallback message «Что-то пошло не так, попробуйте позже»

#### Scenario: Error cleared on next submission

- **WHEN** a server error is displayed on the login or registration form and the user resubmits the form
- **THEN** the previous error message is removed before the new submission is processed and only the result of the new request is shown
