
Feature: RunningUp V11 real-run-first idle journey

  Scenario: Home is always running
    Given the user finished onboarding
    When the Live Journey Home opens
    Then My Runner is visibly running in a 3D course
    And no monster, weapon, HP bar or damage number exists

  Scenario: Idle progress stays small
    Given the user has not verified a run for seven days
    When idle drift is claimed
    Then monthly verified kilometers do not increase
    And Fitness Core does not increase
    And no region final is cleared

  Scenario: One daily content
    Given the user selected one Daily Run Contract today
    When one verified run satisfies the contract
    Then the day's main content is complete
    And additional runs still receive their normal base rewards
    And no second mandatory daily chore is created

  Scenario: 10 kilometer Stride Leap
    Given the user is at route C03-R04-S02
    And a unique verified 10km run is accepted
    When apply_verified_run_v11 commits
    Then exactly one canonical run exists
    And exactly one reward ledger entry exists
    And world progress advances according to versioned route cost
    And all crossed monthly checkpoints are claimed once
    And a Stride Leap replay shows the start and destination routes

  Scenario: Duplicate source reconciliation
    Given the same run arrives from Health Connect and a FIT file
    When canonicalization runs
    Then one canonical run exists
    And rewards, monthly kilometers, crew contribution and Stride Leap occur once

  Scenario: Monthly final
    Given monthly verified distance is 999.9km
    When a verified run moves the total to or above 1000km
    Then checkpoint 120 is claimed exactly once
    And World Crown is set true
    And no checkpoint or monthly tier above 1000km is created

  Scenario: My Runner quality
    Given the release candidate build
    When the runner is captured at 1080x1920
    Then the body is between 3.0 and 3.25 head heights
    And face, hair, clothing layers, shoes and expression are readable
    And no capsule or stick-figure final art is present
