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

  function fillDisplayName(value: string) {
    const inputs = screen.getAllByLabelText(/^name$/i);
    // Mobile card renders first in DOM
    fireEvent.change(inputs[0], { target: { value } });
  }

  describe("identity step (step 1)", () => {
    it("disables Next button when displayName is empty", () => {
      renderFlow();

      expect(getMobileNext()).toBeDisabled();
    });

    it("disables Next button when displayName is only whitespace", () => {
      renderFlow();

      fillDisplayName("   ");

      expect(getMobileNext()).toBeDisabled();
    });

    it("enables Next button when displayName has a non-whitespace character", () => {
      renderFlow();

      fillDisplayName("J");

      expect(getMobileNext()).toBeEnabled();
    });

    it("re-disables Next button if displayName is cleared", () => {
      renderFlow();

      fillDisplayName("Jane");
      expect(getMobileNext()).toBeEnabled();

      fillDisplayName("");
      expect(getMobileNext()).toBeDisabled();
    });
  });

  describe("chairRent step (step 2)", () => {
    function advanceToChairRentStep() {
      renderFlow();
      // Identity step requires a non-empty display name to enable Next
      fillDisplayName("Test User");
      // Advance from identity (step 1) to chairRent (step 2)
      clickNext();
    }

    it("disables Next button when payChairRent is null", () => {
      advanceToChairRentStep();

      expect(getMobileNext()).toBeDisabled();
    });

    it("enables Next button after selecting Yes", () => {
      advanceToChairRentStep();

      clickFirstButton("Yes");

      expect(getMobileNext()).toBeEnabled();
    });

    it("enables Next button after selecting No", () => {
      advanceToChairRentStep();

      clickFirstButton("No");

      expect(getMobileNext()).toBeEnabled();
    });
  });

  describe("rentType step (step 3)", () => {
    function advanceToRentTypeStep() {
      renderFlow();
      fillDisplayName("Test User");
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

    it("enables Next button when payChairRent is false (no chair rent path)", () => {
      renderFlow();
      fillDisplayName("Test User");
      // Advance to chairRent step
      clickNext();
      // Select No — does not pay chair rent
      clickFirstButton("No");
      // Advance to rentType step
      clickNext();

      // rentType is null but payChairRent is false — Next should be enabled
      expect(getMobileNext()).toBeEnabled();
    });
  });

  describe("marketing consent checkbox", () => {
    it("renders unchecked marketing consent checkbox on mobile rentDetails step", () => {
      renderFlow();
      fillDisplayName("Test User");
      // Advance through all steps to rentDetails (step 4)
      clickNext(); // identity → chairRent
      clickFirstButton("No");
      clickNext(); // chairRent → rentType
      clickNext(); // rentType → rentDetails

      const checkbox = screen.getByRole("checkbox", {
        name: /keep me updated about new features/i,
      });
      expect(checkbox).toBeInTheDocument();
      expect(checkbox).not.toBeChecked();
    });

    it("toggles marketing consent checkbox on mobile rentDetails step", () => {
      renderFlow();
      fillDisplayName("Test User");
      // Advance to rentDetails (step 4) via no-chair-rent path
      clickNext();
      clickFirstButton("No");
      clickNext();
      clickNext();

      const checkbox = screen.getByRole("checkbox", {
        name: /keep me updated about new features/i,
      });
      fireEvent.click(checkbox);
      expect(checkbox).toBeChecked();
    });
  });
});
