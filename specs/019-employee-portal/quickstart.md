# Quickstart: Employee Portal & Independent Auth

This feature separates user registration from pharmacy registration, transforming the system into a platform-centric model.

1. **User Registration**: Users now register independently at `/auth/register` and choose a unique username (e.g., `@ahmed_ali`).
2. **Employee Portal**: Independent users log in to see their standalone Employee Portal (Dashboard) displaying their username and pending employment requests.
3. **Hiring**: Pharmacy Admins navigate to "Staff Management" -> "Hire via Username", enter the username (e.g., `@ahmed_ali`), and send an employment request.
4. **Acceptance**: The employee reviews and accepts the request in their portal.
5. **Switching**: If an employee is hired by multiple pharmacies, they are presented with a Workspace Switcher upon login.
