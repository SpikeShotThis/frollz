Feature: Shared Typeahead Dictionary
  Users get ranked text suggestions while still being able to submit free text.

  Background:
    Given I am authenticated as "demo@example.com"

  Scenario: Emulsion create shows manufacturer and brand suggestions
    Given emulsion reference values exist for manufacturer "Kodak" and brand "Portra 400"
    When I open the emulsion create form
    And I type "Kod" into the emulsion manufacturer field
    Then I see "Kodak" as an emulsion suggestion
    When I type "Por" into the emulsion brand field
    Then I see "Portra 400" as an emulsion suggestion

  Scenario: Emulsion create accepts free text and upserts reference values
    When I create an emulsion using free text manufacturer "Custom Maker" and brand "Custom Stock 800"
    Then manufacturer suggestion query for "custom maker" returns "Custom Maker"
    And brand suggestion query for "custom stock 800" returns "Custom Stock 800"

  Scenario: Emulsion reference suggestions are ranked by usage count then recency
    Given manufacturer "Ranked Maker" has been used 2 times in emulsion submissions
    And manufacturer "Lower Maker" has been used 1 time in emulsion submissions
    When I request manufacturer suggestions for prefix "m"
    Then the first manufacturer suggestion should be "Ranked Maker"

  Scenario: Device create shows suggestions for make model and system
    Given device reference values exist for make "Nikon", model "F3", and system "V-System"
    When I open the device create form
    And I choose camera in the device create form
    And I choose film format "35mm" in the device create form
    And I type "Nik" into the device make field
    Then I see "Nikon" as a device suggestion
    When I type "F3" into the device model field
    Then I see "F3" as a device suggestion
    When I choose interchangeable back in the device create form
    And I choose film format "120" in the device create form
    And I type "V-S" into the device system field
    Then I see "V-System" as a device suggestion

  Scenario: Lab suggestions appear in sent for dev and developed forms and are user isolated
    Given lab reference values exist for name "Indie Lab" and contact "hello@indielab.dev"
    And another user has lab reference values for name "Other User Lab"
    When I open film detail for "Typeahead Film Roll"
    And I open the sent for dev event form
    And I type "Ind" into the sent for dev lab name field
    Then I see "Indie Lab" as a lab suggestion
    And I do not see "Other User Lab" as a lab suggestion
    When I submit sent for dev with lab name "Indie Lab" and lab contact "hello@indielab.dev"
    And I open the developed event form
    And I type "Ind" into the developed lab name field
    Then I see "Indie Lab" as a lab suggestion
