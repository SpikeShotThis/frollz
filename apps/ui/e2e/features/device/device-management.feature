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
