import { render, screen, fireEvent, act } from "@testing-library/react";
import { ProfileSetupFlow } from "../profile-setup-flow";

// Suppress fetch errors from saveProfile during tests
global.fetch = jest.fn();

describe("ProfileSetupFlow mobile step validation", () => {
  function renderFlow() {
    return render(
      <ProfileSetupFlow initialCurrency="GBP" initialTimezone="Europe/London" />,
    );
  }

  function getMobileNext() {
    return screen.getByTestId("mobile-next");
  }

  function clickNext() {
    act(() => {
      fireEvent.click(getMobileNext());
    });
  }

  /**
   * When both mobile and desktop cards render the same buttons (e.g. "Yes"/"No"),
   * click the first matching button — which is always in the mobile card since it
   * appears earlier in the DOM.
   */
  function clickFirstButton(name: string) {
    const buttons = screen.getAllByRole("button", { name });
    fireEvent.click(buttons[0]);
  }

  describe("chairRent step (step 2)", () => {
    it("disables Next button when payChairRent is null", () => {
      renderFlow();
      // Advance from identity (step 1) to chairRent (step 2)
      clickNext();

      expect(getMobileNext()).toBeDisabled();
    });

    it("enables Next button after selecting Yes", () => {
      renderFlow();
      clickNext();

      clickFirstButton("Yes");

      expect(getMobileNext()).toBeEnabled();
    });

    it("enables Next button after selecting No", () => {
      renderFlow();
      clickNext();

      clickFirstButton("No");

      expect(getMobileNext()).toBeEnabled();
    });
  });

  describe("rentType step (step 3)", () => {
    function advanceToRentTypeStep() {
      renderFlow();
      // Advance to chairRent step
      clickNext();
      // Select Yes to pay chair rent
      clickFirstButton("Yes");
      // Advance to rentType step
      clickNext();
    }

    it("disables Next button when rentType is null", () => {
      advanceToRentTypeStep();

      expect(getMobileNext()).toBeDisabled();
    });

    it("enables Next button after selecting Fixed rate", () => {
      advanceToRentTypeStep();

      clickFirstButton("Fixed rate");

      expect(getMobileNext()).toBeEnabled();
    });

    it("enables Next button after selecting Commission", () => {
      advanceToRentTypeStep();

      clickFirstButton("Commission");

      expect(getMobileNext()).toBeEnabled();
    });
  });
});
