Feature: Emulsion Browser
  Users browse the shared emulsion reference catalog and open detail pages.

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

  Scenario: Emulsion form requires required fields
    When I try to submit an emulsion with missing required fields
    Then I see an emulsion form validation message containing "Manufacturer, brand, ISO, process, and at least one format are required"

  Scenario: Unauthenticated users are redirected from emulsions
    Given I am not authenticated
    When I navigate to "/emulsions"
    Then I am redirected to the login page
