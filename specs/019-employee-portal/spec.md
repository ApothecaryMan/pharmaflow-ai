# Feature Specification: Employee Portal & Independent Authentication

**Feature Branch**: `019-employee-portal`  
**Created**: 2026-05-31  
**Status**: Draft  
**Input**: User description: "انا بفكر الغي اضافة موظف بالطريقة العادية واخليها منفصل بحيث الموظف نفسه... طاب لو الموظف عايز ينشئ حساب هيبقا فيه صفحة خاصه بيه مختلف عن صفحات الصيدلية"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Employee Independent Registration (Priority: P1)

As a pharmacy professional (pharmacist, cashier, etc.), I want to create and manage my own independent profile on the platform so that I can maintain my professional identity and credentials across different pharmacies.

**Why this priority**: Core enabler for the independent employee model. Without this, employees cannot exist independently of a pharmacy.

**Independent Test**: Can be fully tested by registering a new user as an individual and accessing their standalone employee portal without being tied to any organization.

**Acceptance Scenarios**:

1. **Given** a new user on the registration page, **When** they choose "Register as Individual/Employee" and submit their details (Name, Phone, Email, Password), **Then** an independent user account is created.
2. **Given** an independent user account, **When** the user logs in, **Then** they are directed to an Employee Portal showing their unique username/QR code and profile information.

---

### User Story 2 - Pharmacy Requesting an Employee (Priority: P1)

As a pharmacy owner/admin, I want to invite an existing independent employee to join my pharmacy using their unique username, so that I don't have to manually enter their personal data.

**Why this priority**: This connects the independent employee to the organization, replacing the old manual data entry flow.

**Independent Test**: Can be tested by an admin entering a valid username and seeing the employment request created.

**Acceptance Scenarios**:

1. **Given** a pharmacy admin in the "Staff Management" section, **When** they click "Add Employee via Username", enter a valid username, assign a role/salary, and submit, **Then** a pending employment request is created for that employee.
2. **Given** an invalid username, **When** the admin submits the request, **Then** the system shows an "Employee not found" error.

---

### User Story 3 - Employee Accepting Employment Request (Priority: P2)

As an independent employee, I want to review and accept/reject employment requests from pharmacies, so that I have control over which organizations I am affiliated with.

**Why this priority**: Completes the handshake workflow.

**Independent Test**: Can be tested by an employee logging into their portal, seeing a pending request, and accepting it.

**Acceptance Scenarios**:

1. **Given** an employee with a pending employment request, **When** they log into their portal, **Then** they see a notification about the request.
2. **Given** a pending request, **When** the employee clicks "Accept", **Then** they are officially linked to the pharmacy with the assigned role, and the pharmacy admin sees their status as "Active".

---

### User Story 4 - Workspace Switching for Multi-Employment (Priority: P3)

As an employee working at multiple pharmacies, I want to be able to switch between the different pharmacy workspaces I belong to after logging in.

**Why this priority**: Essential for part-time/locum pharmacists working in multiple locations.

**Independent Test**: Testable by linking a user to two organizations and ensuring they can select which context to load.

**Acceptance Scenarios**:

1. **Given** an employee linked to multiple active pharmacies, **When** they log in, **Then** they are presented with a Workspace Switcher screen to choose which pharmacy to enter.
2. **Given** an employee linked to only one pharmacy, **When** they log in, **Then** they are redirected straight into that pharmacy's workspace.

### Edge Cases

- What happens when a pharmacy deletes an employee? (The employee's independent account remains, but the linkage is marked as inactive/terminated).
- What happens if an employee tries to register with a phone number/email already registered to an organization owner?
- How does the system handle an employment request sent to an employee who is already linked to the same pharmacy?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST provide distinct registration flows for Organizations (Pharmacies) and Individuals (Employees).
- **FR-002**: System MUST allow users to choose a unique username (or QR code) for each registered individual.
- **FR-003**: System MUST provide an "Employee Portal" accessible to individuals not currently operating within a pharmacy context.
- **FR-004**: System MUST allow Pharmacy Admins to send employment requests using a username.
- **FR-005**: System MUST allow individuals to accept or reject employment requests.
- **FR-006**: System MUST allow an individual to be linked to multiple organizations (pharmacies) simultaneously.
- **FR-007**: System MUST provide a Workspace Switcher upon login if the user is linked to multiple active workspaces.

### Key Entities

- **Profile/User**: Represents the independent individual (Name, Email, Phone, Password, Username).
- **Organization**: Represents the Pharmacy entity.
- **Employment (Linkage)**: The many-to-many relationship connecting a User to an Organization (Role, Branch, Salary, Status: Pending/Active/Terminated).

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Employees can successfully register an independent account and view their username in under 2 minutes.
- **SC-002**: Pharmacy Admins can send an employment request using a username in under 30 seconds.
- **SC-003**: System accurately routes users with single affiliations directly to their workspace, and multi-affiliation users to a workspace switcher 100% of the time.
