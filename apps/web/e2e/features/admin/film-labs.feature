Feature: Film Lab Administration
  Users manage film lab metadata from the admin area.

  Background:
    Given I am authenticated as "demo@example.com"

  Scenario: Save default processes for a film lab
    Given a film lab exists named "Process Lab"
    When I set film lab "Process Lab" default processes to "C-41, E-6"
    Then film lab "Process Lab" has default processes "C-41, E-6"
