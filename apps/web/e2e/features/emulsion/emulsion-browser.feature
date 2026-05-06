Feature: Emulsion Browser
  Users browse and manage the shared emulsion catalog.

  Background:
    Given I am authenticated as "demo@example.com"

  Scenario: Browse all emulsions
    When I open the emulsion catalog
    Then I see emulsion row "Kodak Portra"
    And I see emulsion row "Ilford HP5 Plus"

  Scenario: Browse emulsions by section
    When I open the "black-and-white" emulsion section
    Then I see emulsion row "Ilford HP5 Plus"

  Scenario: Open an emulsion detail page
    When I open emulsion detail for "Kodak Portra"
    Then I see emulsion detail process containing "C-41"
    And I see emulsion detail balance containing "daylight"

  Scenario: Emulsion form requires required fields
    When I try to submit an emulsion with missing required fields
    Then I see an emulsion form validation message containing "Manufacturer, brand, ISO, process, and at least one format are required"

  Scenario: Edit emulsion from catalog
    Given an editable emulsion named "BDD Edit Row"
    When I edit emulsion "BDD Edit Row" from the catalog
    Then I see emulsion row "BDD Updated Row"

  Scenario: Edit emulsion from detail page
    Given an editable emulsion named "BDD Edit Detail"
    When I edit emulsion "BDD Edit Detail" from detail page
    Then I see emulsion detail process containing "Black and White"

  Scenario: Delete emulsion from catalog
    Given an editable emulsion named "BDD Delete Row"
    When I delete emulsion "BDD Delete Row" from the catalog
    Then I do not see emulsion row "BDD Delete Row"

  Scenario: Deleting emulsion in use is blocked
    Given an emulsion named "BDD In Use" is used by a film
    When I try to delete emulsion "BDD In Use" from the catalog
    Then I see an emulsion conflict message containing "in use"

  Scenario: Unauthenticated users are redirected from emulsions
    Given I am not authenticated
    When I navigate to "/emulsions"
    Then I am redirected to the login page
