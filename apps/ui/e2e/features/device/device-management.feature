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
