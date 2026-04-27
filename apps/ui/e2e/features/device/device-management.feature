Feature: Device Management
  Authenticated users create and view camera records, while cross-user access is blocked.

  Background:
    Given I am authenticated as "demo@example.com"

  Scenario: Create a camera and open its detail page
    When I create a camera with make "Canon" and model "AE-1" for format "35mm"
    Then I see "Canon AE-1" in the device table
    When I open the device detail for "Canon AE-1"
    Then I see device detail header "Canon AE-1"

  Scenario: Device detail for another user is not visible
    Given another user has a camera with make "Leica" and model "M6"
    When I open the other user's device detail
    Then I see a device detail error containing "Device not found"

  Scenario: Unauthenticated users are redirected from devices
    Given I am not authenticated
    When I navigate to "/devices"
    Then I am redirected to the login page

  Scenario: Selecting a frame size is disabled until a format is chosen
    Given I have opened the add device form
    Then the frame size field should be disabled

  Scenario: Selecting a frame size should be dependent on the film format
    Given I have opened the add device form
    When I select the format "35mm"
    Then only frame sizes compatible with "35mm" should be available
  
  Scenario: Device form requires required fields
    When I try to submit a device with missing required fields
    Then I see a device form validation message containing "Make, model, and format are required"
  
  Scenario: Creating a non directly loadable camera should not allow the selection of frame size
    Given I have opened the add device form
    And I have chosen the device type of "Camera"
    And I select that camera is not directly loadable
    When I select the format "120"
    Then the frame size field should be disabled

  Scenario: Cannot select a frame size until a format has been selected for an interchangeable back
    Given I have opened the add device form
    And I have chosen the device type of "Interchangeable back"
    When a format has not been selected
    Then the frame size field should be disabled

  Scenario: Frame size is enabled when a directly loadable camera has a format selected
    Given I have opened the add device form
    And I have chosen the device type of "Camera"
    When a toggle for "Is this camera directly loadable?" is visible
    And the toggle is set to "Yes"
    Then the frame size field should be disabled
    When I select the format "120"
    Then the frame size field should be enabled

  Scenario: Frame size stays disabled when a non-directly loadable camera has a format selected
    Given I have opened the add device form
    And I have chosen the device type of "Camera"
    When a toggle for "Is this camera directly loadable?" is visible
    And the toggle is set to "No"
    And I select the format "120"
    Then the frame size field should be disabled

  Scenario: Open a the child <value> device page
    Given the child page of <value> has been opened
    When I have opened the add device form
    Then the device type field should be locked to <value>
    And the frame size field should be disabled
    When I select the format "35mm"
    Then the frame size field should be enabled

    Examples:
    | value |
    | Cameras |
    | Interchangeable Back |
    | Film Holder |