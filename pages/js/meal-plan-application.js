
/* 2026-2027 Meal Plan Application
 *
 * Accessibility improvements:
 * 1. Validation errors are contained within their respective steps.
 * 2. Errors are cleared when leaving a step.
 * 3. Invalid selections scroll into view.
 * 4. Selected meal-plan and Dining Dollar buttons become gray
 *    and display "Selected".
 * 5. A required review checkbox must be checked before confirmation.
 */

(async function () {
  const {
    h,
    btn,
    go,
    notify,
    reload,
    APIError,
    sessionRequest,
    formatTime,
    money,
    hasData,
    Stepper,
    step,
    stepNav,
    checkbox,
    separator
  } = Portal;

  const YEAR_SLUG = "2026-2027";

  const DINING_HALLS = [
    {
      name: "Holloway Commons",
      description:
        "A residential dining location with a variety of meals and dining options."
    },
    {
      name: "Philbrook Dining",
      description:
        "A campus dining location offering meals and options for students."
    },
  ];

  const MEAL_PLANS = [
    {
      name: "Unlimited",
      price: 3200.0,
      swipes: "Unlimited meal swipes",
      description:
        "For students who want frequent access to residential dining."
    },
    {
      name: "14 Meals Per Week",
      price: 2800.0,
      swipes: "14 meal swipes per week",
      description:
        "A flexible option for students who eat most meals on campus."
    },
    {
      name: "10 Meals Per Week",
      price: 2400.0,
      swipes: "10 meal swipes per week",
      description:
        "For students who want a smaller weekly meal allowance."
    },
    {
      name: "7 Meals Per Week",
      price: 2000.0,
      swipes: "7 meal swipes per week",
      description:
        "For students who plan to eat on campus once a day on average."
    }
  ];

  const DINING_DOLLAR_OPTIONS = [
    {
      amount: 0,
      price: 0.0,
      description: "No additional Dining Dollars."
    },
    {
      amount: 100,
      price: 100.0,
      description: "$100 to spend at eligible campus dining locations."
    },
    {
      amount: 250,
      price: 250.0,
      description: "$250 for additional dining flexibility."
    },
    {
      amount: 500,
      price: 500.0,
      description: "$500 for frequent purchases at eligible locations."
    }
  ];

  const mealRequest = (method, data) =>
    sessionRequest(method, `/meal-plans/${YEAR_SLUG}/selection`, data);

  const application = {
    terms_accepted: false,
    meal_plan: null,
    dining_dollars: DINING_DOLLAR_OPTIONS[0]
  };

  /* ============================================================
     VALIDATION HELPERS
     ============================================================ */

  function createErrorMessage(message) {
    return h("p", {
      class: "validation-message",
      style:
        "display:none;color:#b42318;font-size:0.875rem;margin:0.5rem 0 0;",
      text: `(!) ${message}`
    });
  }

  function showFieldError(field, errorElement, invalid) {
    errorElement.style.display = invalid ? "block" : "none";

    if (field) {
      field.style.border = invalid ? "2px solid #b42318" : "";
      field.style.borderRadius = invalid ? "6px" : "";
      field.style.padding = invalid ? "0.5rem" : "";
      field.style.backgroundColor = invalid ? "#fff5f5" : "";
    }
  }

  function getCheckboxInput(component) {
    return component.el.matches("input")
      ? component.el
      : component.el.querySelector("input");
  }

  function scrollToError(errorElement) {
    if (!errorElement) return;

    errorElement.scrollIntoView({
      behavior: "smooth",
      block: "center"
    });
  }

  function styleSelectedCard(card, selected) {
    card.classList.remove("card--selected");

    card.style.backgroundColor = selected
      ? "#f3f4f6"
      : "";

    card.style.border = selected
      ? "2px solid #2563eb"
      : "";

    card.style.outline = selected
      ? "2px solid #2563eb"
      : "";

    card.style.outlineOffset = selected
      ? "1px"
      : "";
  }

  function updateSelectionButton(button, selected, defaultText) {
    button.textContent = selected
      ? "Selected"
      : defaultText;

    button.style.border = selected
      ? "1px solid #2563eb"
      : "";

    button.style.color = selected
      ? "#2563eb"
      : "";

    button.style.backgroundColor = selected
      ? "#f3f4f6"
      : "";
  }

  /* ============================================================
     LOAD EXISTING SELECTION
     ============================================================ */

  let existing = null;

  try {
    existing = await mealRequest("GET");
  } catch (error) {
    notify(error.message, "negative");
  }

  if (!hasData(existing)) {
    existing = null;
  }

  if (existing) {
    application.terms_accepted = true;

    application.meal_plan =
      MEAL_PLANS.find(
        plan => plan.name === existing.meal_plan
      ) || null;

    application.dining_dollars =
      DINING_DOLLAR_OPTIONS.find(
        option => option.amount === existing.dining_dollars
      ) || DINING_DOLLAR_OPTIONS[0];
  }

  /* ============================================================
     EXISTING SELECTION BANNER
     ============================================================ */

  function existingBanner(record) {
    async function cancel() {
      try {
        await mealRequest("DELETE");
        reload();
      } catch (error) {
        notify(error.message, "negative");
      }
    }

    return h("div", {
      class: "card"
    },

      h("p", {
        class: "semibold",
        text:
          `You confirmed ${record.meal_plan} with ` +
          `${money(record.dining_dollars, 0)} Dining Dollars ` +
          `on ${formatTime(record.confirmed_at)}.`
      }),

      h("p", {
        class: "text-sm muted",
        text:
          `Confirmation ${record.confirmation}. ` +
          "Confirming again below replaces this selection."
      }),

      btn("Cancel selection", {
        icon: "close",
        variant: "flat",
        dense: true,
        onClick: cancel
      })
    );
  }

  /* ============================================================
     STEP 1: INTRODUCTION / TERMS
     ============================================================ */

  const terms = checkbox(
    "I have read and agree to the meal plan terms.",
    application.terms_accepted
  );

  const termsInput = getCheckboxInput(terms);

  const termsField = h("div", {
    class: "validation-field"
  }, terms.el);

  const termsError = createErrorMessage(
    "Please agree to the meal plan terms."
  );

  termsField.append(termsError);

  function validateTerms() {
    if (!terms.value) {
      showFieldError(termsField, termsError, true);
      scrollToError(termsError);
      termsInput.focus();

      return false;
    }

    showFieldError(termsField, termsError, false);

    application.terms_accepted = true;

    return true;
  }

  termsInput.addEventListener("change", () => {
    if (terms.value) {
      showFieldError(termsField, termsError, false);
    }
  });

  /* ============================================================
     STEP 2: MEAL PLAN SELECTION
     ============================================================ */

  const planStatus = h("p", {
    class: "muted"
  });

  const planCards = [];

  const planField = h("div", {
    class: "validation-field"
  });

  const planError = createErrorMessage(
    "Please select a meal plan before continuing."
  );

  function paintPlanStatus() {
    planStatus.textContent = application.meal_plan
      ? `Selected: ${application.meal_plan.name} — ${money(application.meal_plan.price)}`
      : "No meal plan selected.";

    planCards.forEach(({ plan, card, selectButton }) => {
      const selected = application.meal_plan === plan;

      styleSelectedCard(card, selected);

      updateSelectionButton(
        selectButton,
        selected,
        "Select Plan"
      );
    });
  }

  function selectMealPlan(plan) {
    application.meal_plan = plan;

    paintPlanStatus();

    showFieldError(planField, planError, false);

    notify(`${plan.name} selected.`, "positive");
  }

  function validateMealPlan() {
    if (!application.meal_plan) {
      showFieldError(planField, planError, true);

      scrollToError(planError);

      return false;
    }

    showFieldError(planField, planError, false);

    return true;
  }

  function continueToDiningDollars() {
    if (!validateMealPlan()) {
      return;
    }

    stepper.next();
  }

  /* ============================================================
     STEP 3: DINING DOLLARS
     ============================================================ */

  const dollarsStatus = h("p", {
    class: "muted"
  });

  const dollarCards = [];

  function paintDollarsStatus() {
    dollarsStatus.textContent =
      `Selected amount: ${money(application.dining_dollars.amount)}`;

    dollarCards.forEach(({ option, card, selectButton }) => {
      const selected = application.dining_dollars === option;

      styleSelectedCard(card, selected);

      updateSelectionButton(
        selectButton,
        selected,
        "Select"
      );
    });
  }

  function selectDiningDollars(option) {
    application.dining_dollars = option;

    paintDollarsStatus();

    notify(
      `$${option.amount} in Dining Dollars selected.`,
      "positive"
    );
  }

  /* ============================================================
     STEP 4: SUMMARY / REVIEW
     ============================================================ */

  const summaryContent = h("div", {
    class: "col"
  });

  const reviewConfirmation = checkbox(
    "I have reviewed my meal plan selection and confirm that the information above is correct.",
    false
  );

  const reviewInput = getCheckboxInput(reviewConfirmation);

  const reviewField = h("div", {
    class: "validation-field"
  }, reviewConfirmation.el);

  const reviewError = createErrorMessage(
    "Please confirm that you have reviewed your selection."
  );

  reviewField.append(reviewError);

  reviewInput.addEventListener("change", () => {
    if (reviewInput.checked) {
      showFieldError(reviewField, reviewError, false);
    }
  });

  function showSummary() {
    if (!validateMealPlan()) {
      return;
    }

    const plan = application.meal_plan;
    const dollars = application.dining_dollars;
    const total = plan.price + dollars.price;

    // Reset the acknowledgment every time the user enters Summary.
    reviewInput.checked = false;

    showFieldError(reviewField, reviewError, false);

    const summaryCard = h("div", {
      class: "card card--pad"
    },

      h("h3", {
        class: "text-lg semibold",
        text: "Selected Meal Plan"
      }),

      h("p", {
        class: "text-2xl bold",
        text: plan.name
      }),

      h("p", {
        class: "muted",
        text: plan.swipes
      }),

      separator(),

      h("h3", {
        class: "text-lg semibold",
        text: "Additional Dining Dollars"
      }),

      h("p", {
        class: "text-xl bold",
        text: money(dollars.amount)
      }),

      separator(),

      h("h3", {
        class: "text-lg semibold",
        text: "Cost Breakdown"
      }),

      h("div", {
        class: "cost-row"
      },

        h("span", {
          text: "Meal Plan"
        }),

        h("span", {
          text: money(plan.price)
        })
      ),

      h("div", {
        class: "cost-row"
      },

        h("span", {
          text: "Dining Dollars"
        }),

        h("span", {
          text: money(dollars.price)
        })
      ),

      separator(),

      h("div", {
        class: "cost-row"
      },

        h("span", {
          class: "text-xl bold",
          text: "Total Sample Cost"
        }),

        h("span", {
          class: "text-2xl bold",
          text: money(total)
        })
      ),

      h("p", {
        class: "text-sm muted-2",
        text:
          "This is a prototype estimate, not an official university bill."
      })
    );

    // Error remains inside the Summary step.
    summaryContent.replaceChildren(
      summaryCard,
      reviewField
    );

    stepper.next();
  }

  /* ============================================================
     STEP 5: CONFIRMATION
     ============================================================ */

  const confirmationContent = h("div", {
    class: "col"
  });

  
function showConfirmation(record) {
  const plan = application.meal_plan;
  const dollars = application.dining_dollars;
  const total = plan.price + dollars.price;

  confirmationContent.replaceChildren(

    h("div", {
      class: "card card--pad"
    },

      /* Confirmation success header */
      h("div", {
        class: "row"
      },

        h("span", {
          class: "material-icons",
          style: "color: var(--positive)",
          "aria-hidden": "true",
          text: "check_circle"
        }),

        h("h2", {
          class: "text-2xl bold",
          text: "Selection Confirmed!"
        })
      ),

      h("p", {
        class: "semibold",
        text: `Confirmation Number: ${record.confirmation}`
      }),

      h("p", {
        class: "muted",
        text: `Confirmed ${formatTime(record.confirmed_at)}`
      }),

      separator(),

      /* Selected Meal Plan */
      h("h3", {
        class: "text-lg semibold",
        text: "Your Meal Plan"
      }),

      h("p", {
        class: "text-2xl bold",
        text: plan.name
      }),

      h("p", {
        class: "muted",
        text: plan.swipes
      }),

      h("p", {
        class: "text-lg",
        text: `Meal Plan Cost: ${money(plan.price)}`
      }),

      separator(),

      /* Dining Dollars */
      h("h3", {
        class: "text-lg semibold",
        text: "Dining Dollars"
      }),

      h("p", {
        class: "text-xl bold",
        text: money(dollars.amount)
      }),

      h("p", {
        class: "muted",
        text: dollars.description
      }),

      h("p", {
        class: "text-lg",
        text: `Dining Dollars Cost: ${money(dollars.price)}`
      }),

      separator(),

      /* Cost Summary */
      h("h3", {
        class: "text-lg semibold",
        text: "Cost Summary"
      }),

      h("div", {
        class: "cost-row"
      },

        h("span", {
          text: "Meal Plan"
        }),

        h("span", {
          text: money(plan.price)
        })
      ),

      h("div", {
        class: "cost-row"
      },

        h("span", {
          text: "Dining Dollars"
        }),

        h("span", {
          text: money(dollars.price)
        })
      ),

      separator(),

      h("div", {
        class: "cost-row"
      },

        h("span", {
          class: "text-xl bold",
          text: "Total"
        }),

        h("span", {
          class: "text-2xl bold",
          text: money(total)
        })
      ),

      h("p", {
        class: "text-sm muted-2",
        text:
          "This is a prototype confirmation. " +
          "Nothing is billed or sent to UNH."
      }),

      btn("Back to Meal Plans", {
        icon: "arrow_back",
        class: "mt-2",
        onClick: () => go("meal-plans.html")
      })
    )
  );
}


  /* ============================================================
     CONFIRM SUBMISSION
     ============================================================ */

  async function confirmMealPlan(button) {
    // Required review checkbox.
    if (!reviewInput.checked) {
      showFieldError(reviewField, reviewError, true);

      reviewInput.focus();

      scrollToError(reviewError);

      return;
    }

    showFieldError(reviewField, reviewError, false);

    // Required terms checkbox.
    if (!validateTerms()) {
      notify(
        "Please accept the meal plan terms before confirming.",
        "warning"
      );

      return;
    }

    // Required meal plan.
    if (!validateMealPlan()) {
      notify(
        "Please select a meal plan before confirming.",
        "warning"
      );

      return;
    }

    button.disabled = true;

    try {
      const record = await mealRequest("POST", {
        meal_plan: application.meal_plan.name,
        dining_dollars: application.dining_dollars.amount,
        terms_accepted: application.terms_accepted
      });

      showConfirmation(record);

      stepper.next();

    } catch (error) {
      if (!(error instanceof APIError)) {
        throw error;
      }

      const details = Object.values(error.errors).join(" ");

      notify(
        `${error.message} ${details}`.trim(),
        "negative"
      );

    } finally {
      button.disabled = false;
    }
  }

  /* ============================================================
     NAVIGATION BUTTONS
     ============================================================ */

  const confirmButton = btn("Confirm Selection", {
    onClick: () => confirmMealPlan(confirmButton)
  });

  function back() {
    return btn("Back", {
      variant: "flat",
      onClick: () => stepper.previous()
    });
  }

  /* ============================================================
     MEAL PLAN CARDS
     ============================================================ */

  const planGrid = h("div", {
    class: "grid grid--2 grid--tight"
  },

    MEAL_PLANS.map(plan => {
      const selectButton = btn("Select Plan", {
        class: "mt-2",
        onClick: () => selectMealPlan(plan)
      });

      const card = h("div", {
        class: "card"
      },

        h("h3", {
          class: "text-xl bold",
          text: plan.name
        }),

        h("p", {
          class: "text-lg",
          text: `${money(plan.price)} (sample price)`
        }),

        h("p", {
          class: "semibold",
          text: plan.swipes
        }),

        h("p", {
          text: plan.description
        }),

        selectButton
      );

      planCards.push({
        plan,
        card,
        selectButton
      });

      return card;
    })
  );

  planField.append(
    planStatus,
    planGrid,
    planError
  );

  /* ============================================================
     DINING DOLLAR CARDS
     ============================================================ */

  const dollarGrid = h("div", {
    class: "grid grid--2 grid--tight"
  },

    DINING_DOLLAR_OPTIONS.map(option => {
      const selectButton = btn("Select", {
        onClick: () => selectDiningDollars(option)
      });

      const card = h("div", {
        class: "card"
      },

        h("h3", {
          class: "text-lg bold",
          text:
            `$${option.amount.toLocaleString("en-US")} Dining Dollars`
        }),

        h("p", {
          text: `Cost: ${money(option.price)}`
        }),

        h("p", {
          text: option.description
        }),

        selectButton
      );

      dollarCards.push({
        option,
        card,
        selectButton
      });

      return card;
    })
  );

  /* ============================================================
     STEPPER
     ============================================================ */

  const stepperEl = h("div", {
    class: "stepper"
  },

    step("Introduction",

      h("h2", {
        class: "text-2xl bold",
        text: "Explore Campus Dining"
      }),

      h("div", {
        class: "grid grid--3 grid--tight"
      },

        DINING_HALLS.map(hall =>
          h("div", {
            class: "card"
          },

            h("h3", {
              class: "text-lg semibold",
              text: hall.name
            }),

            h("p", {
              text: hall.description
            })
          )
        )
      ),

      separator(),

      h("h2", {
        class: "text-xl bold",
        text: "Meal Plan Terms"
      }),

      h("p", {
        class: "muted",
        text:
          "This is a prototype application. Meal plan prices and " +
          "options are examples and are not official UNH pricing. " +
          "Review your selection before submitting."
      }),

      termsField,

      stepNav(
        btn("Continue", {
          onClick: () => {
            if (validateTerms()) {
              stepper.next();
            }
          }
        })
      )
    ),

    step("Select Meal Plan",

      h("h2", {
        class: "text-2xl bold",
        text: "Choose Your Meal Plan"
      }),

      planField,

      h("div", {
        class: "row row--between"
      },

        back(),

        btn("Continue", {
          onClick: continueToDiningDollars
        })
      )
    ),

    step("Dining Dollars",

      h("h2", {
        class: "text-2xl bold",
        text: "Add Dining Dollars"
      }),

      h("p", {
        class: "muted",
        text:
          "Choose an optional amount to add to your account."
      }),

      dollarsStatus,

      dollarGrid,

      h("div", {
        class: "row row--between"
      },

        back(),

        btn("Review Summary", {
          onClick: showSummary
        })
      )
    ),

    step("Summary",

      h("h2", {
        class: "text-2xl bold",
        text: "Review Your Selections"
      }),

      summaryContent,

      h("div", {
        class: "row row--between"
      },

        back(),

        confirmButton
      )
    ),

    step("Confirmation", confirmationContent)
  );

  /* ============================================================
     PAGE
     ============================================================ */

  const appElement = document.getElementById("app");

  appElement.replaceChildren(

    h("div", {
      class: "row"
    },

      btn("Back to Academic Years", {
        icon: "arrow_back",
        variant: "flat",
        onClick: () => go("meal-plans.html")
      })
    ),

    h("h1", {
      class: "text-3xl bold",
      text: "2026–2027 Meal Plan Application"
    }),

    h("p", {
      class: "muted",
      text:
        "Review the dining information, select your meal plan, " +
        "choose any additional Dining Dollars, and review your choices."
    }),

    ...(existing ? [existingBanner(existing)] : []),

    stepperEl
  );

  const stepper = new Stepper(stepperEl, 1);

  /* Initial selection styling. */

  paintPlanStatus();
  paintDollarsStatus();

})();
