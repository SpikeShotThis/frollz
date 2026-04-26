Feature: Film Inventory
  Users create film records and advance lifecycle state transitions through the UI.

  Background:
    Given I am authenticated as "demo@example.com"

  Scenario: Add a purchased film from the inventory page
    When I add a film named "Portra Test Roll"
    Then I see "Portra Test Roll" in the film table
    And the film state badge for "Portra Test Roll" is "Purchased"

  Scenario: Record storage and load transitions
    Given a camera exists for loading named "Canon AE-1"
    And a purchased film exists named "Lifecycle Roll"
    When I open film detail for "Lifecycle Roll"
    And I record the film as stored in "Freezer"
    And I record the film as loaded into device "Canon AE-1"
    Then I see the film current state "Loaded"

  Scenario: Film form requires required fields
    When I try to submit film with missing required fields
    Then I see a film form validation message containing "Name, emulsion, format, and package are required"

  Scenario: Unauthenticated users are redirected from film inventory
    Given I am not authenticated
    When I navigate to "/film"
    Then I am redirected to the login page
