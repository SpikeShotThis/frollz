Feature: Export Import Data

    Users can export and import their data from an admin interface

  Background:
    Given I am authenticated as "demo@example.com"
    And I have the following devices:
      | make   | model  | format |
      | Canon  | AE-1   | 35mm   |
      | Nikon  | F3     | 35mm   |
      | Hasselblad | 500C/M | Medium |
    And I have the following films:
      | name       | format  |
      | Kodak Portra 400 | 35mm   |
      | Fuji Pro 400H   | Medium |
    And I have the following rolls in the states:
      | name       | device     | film              | state |
      | Roll 1     | Canon AE-1 | Kodak Portra 400 | loaded |
      | Roll 2     | Nikon F3   | Kodak Portra 400 | active |
      | Roll 3     | Hasselblad 500C/M | Fuji Pro 400H | sent for development |
    
    Scenario: Exporting data
        When I navigate to the data export page
        And I click the "Export Data" button
        Then I should receive a file download containing my devices, films, and rolls
