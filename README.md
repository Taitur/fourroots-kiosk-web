# Kiosk Web

Web portal for Eslabón Cloud's Kiosk, focused on self-service HR tasks such as vacations, employee profiles, engagement, and dashboards.

This project is developed collaboratively by a five-person team using Git.

## Design System

All team members must follow the project's Design System when creating or updating pages, components, and styles.

The Design System is available at:

```text
/DesignSystem
```

Its implementation can be found in:

```text
kiosk-web/Views/DesignSystem/Index.cshtml
kiosk-web/wwwroot/css/
```

The Design System defines reusable patterns for:

- Colors and themes
- Typography
- Buttons and cards
- Forms and inputs
- Navigation and tabs
- Posts and surveys
- Avatars and badges
- Modals and notifications
- Manager views
- Responsive layouts

## Team Guidelines

Before building a new interface:

1. Review the Design System.
2. Reuse existing CSS classes whenever possible.
3. Keep colors, spacing, typography, and component behavior consistent.
4. Add reusable components to the Design System when appropriate.
5. Avoid creating one-off styles that duplicate existing components.
6. Test the interface on desktop and mobile screen sizes.
7. Follow accessibility best practices, including semantic HTML, labels, keyboard-friendly controls, and sufficient color contrast.

## Project Structure

```text
kiosk-web/
├── Controllers/       MVC controllers
├── Models/            View models
├── Services/          Application services
├── Views/             Razor views
├── wwwroot/css/       Stylesheets
├── wwwroot/js/        JavaScript files
└── wwwroot/lib/       Frontend libraries
```

## Running the Project

Make sure the .NET 9 SDK is installed, then run:

```bash
dotnet restore
dotnet run --project kiosk-web
```

Open the URL shown in the terminal. To view the Design System, navigate to `/DesignSystem`.

## Git Guidelines

Use clear and descriptive commit messages, for example:

```text
Add vacation request form
Update Design System button variants
Fix responsive dashboard layout
```

Do not commit generated files, local settings, secrets, or build output. These files are covered by `.gitignore`.

Never commit passwords, API keys, private connection strings, or other sensitive information.
