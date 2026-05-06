Feature: Film Inventory
  Users create film records and advance lifecycle state transitions through the web app.

  Background:
    Given I am authenticated as "demo@example.com"

  Scenario: Add a purchased film from the inventory page
    When I add a film named "Portra Test Roll"
    Then I see "Portra Test Roll" in the film table
    And the film state badge for "Portra Test Roll" is "Purchased"

  Scenario: Add a purchased film with an existing supplier
    Given a film supplier exists named "Blue Moon Camera"
    When I add a film named "Supplier Roll" purchased from "Blue Moon Camera" for "12.34" with order "PO-123"
    Then the purchase info for film "Supplier Roll" has supplier "Blue Moon Camera", price "12.34", and order "PO-123"

  Scenario: Add a purchased film with a new supplier
    When I add a film named "New Supplier Roll" purchased from "Fresh Film Shop" for "9.99" with order "NEW-1"
    Then the purchase info for film "New Supplier Roll" has supplier "Fresh Film Shop", price "9.99", and order "NEW-1"

  Scenario: Record storage and load transitions
    Given a camera exists for loading named "Canon AE-1"
    And a purchased film exists named "Lifecycle Roll"
    When I open film detail for "Lifecycle Roll"
    And I record the film as stored in "Freezer"
    And I record the film as loaded into device "Canon AE-1"
    Then I see the film current state "Loaded"

  Scenario: Record scan metadata
    Given a camera exists for loading named "Nikon FM2"
    And a purchased film exists named "Scan Metadata Roll"
    When I open film detail for "Scan Metadata Roll"
    And I advance the film to developed using device "Nikon FM2"
    And I record the film as scanned with scanner "Epson V700" and link "https://example.com/scan"
    Then the latest film event for "Scan Metadata Roll" has scan metadata "Epson V700" and "https://example.com/scan"

  Scenario: Film form requires required fields
    When I try to submit film with missing required fields
    Then I see a film form validation message containing "Name, emulsion, format, and package are required"

  Scenario: Unauthenticated users are redirected from film inventory
    Given I am not authenticated
    When I navigate to "/film"
    Then I am redirected to the login page

  Scenario: Add film form disables dependent fields until a format is chosen
    Given I have opened the add film form from the unfiltered inventory
    Then the emulsion and package type fields should be disabled

  Scenario: Add film form filters options once a format is chosen
    Given I have opened the add film form from the unfiltered inventory
    When I select the format "35mm"
    Then only emulsions compatible with "35mm" should be available
    And only package types compatible with "35mm" should be available

  Scenario: Add film form pre-filters options when opened from a filtered inventory
    When I open the add film form from the inventory filtered to "35mm"
    Then the format field should be locked to "35mm"
    And only emulsions compatible with "35mm" should be available
    And only package types compatible with "35mm" should be available
