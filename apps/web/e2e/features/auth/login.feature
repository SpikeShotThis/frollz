Feature: User Authentication
  Users can sign in with valid credentials and are blocked when credentials are invalid.

  Scenario: Successful login redirects to dashboard
    Given I am on the login page
    When I sign in with test user credentials
    Then I should be on the dashboard

  Scenario: Invalid credentials show an error
    Given I am on the login page
    When I sign in with invalid credentials
    Then I should see an authentication error
