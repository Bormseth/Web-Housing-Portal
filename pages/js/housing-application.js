
/* 2026-2027 Housing Application
 *
 * Accessibility improvements:
 * 1. Required fields must be completed before leaving each step.
 * 2. Errors appear beside their respective fields.
 * 3. Errors clear when corrected or when leaving a step.
 * 4. Invalid fields scroll into view.
 * 5. Step headers cannot bypass validation.
 * 6. Review acknowledgment is required before submission.
 * 7. Additional Housing Considerations is optional.
 * 8. Preferred Roommate Name is editable and required only when
 *    "I have a preferred roommate" is selected.
 */

(async function () {
  const {
    h, btn, iconBtn, go, notify, reload, APIError, sessionRequest,
    formatTime, hasData, Stepper, step, stepNav, checkbox, separator,
    textInput, textArea, select, radioGroup
  } = Portal;

  const YEAR_SLUG = "2026-2027";
  const SELECTION_ROUTE = "room-select.html";

  const CLASS_YEARS = ["First-year", "Sophomore", "Junior", "Senior"];
  const HOUSING_STYLES = [
    "Traditional Residence Hall",
    "Suite-Style Housing",
    "Apartment-Style Housing",
    "No Preference"
  ];
  const ROOM_PREFERENCES = ["Single", "Double", "Triple", "No Preference"];
  const ROOMMATE_PREFERENCES = [
    "I have a preferred roommate",
    "I would like a roommate assigned",
    "I prefer a single room"
  ];

  const housingRequest = (method, data) =>
    sessionRequest(method, `/housing-applications/${YEAR_SLUG}`, data);

  const app = document.getElementById("app");
  app.classList.add("page--narrow");

  /* ---------- Validation helpers ---------- */

  function createErrorMessage(message) {
    return h("p", {
      class: "validation-message",
      style: "display:none;color:#b42318;font-size:0.875rem;margin:0.5rem 0 0;",
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
      field.setAttribute("aria-invalid", invalid ? "true" : "false");
    }
  }

  function getInput(component) {
    return component.el.matches("input, select, textarea")
      ? component.el
      : component.el.querySelector("input, select, textarea");
  }

  function getRadioInputs(component) {
    return [...component.el.querySelectorAll('input[type="radio"]')];
  }

  function getCheckboxInput(component) {
    return component.el.matches("input")
      ? component.el
      : component.el.querySelector("input");
  }

  function scrollToError(errorElement) {
    if (errorElement) {
      errorElement.scrollIntoView({
        behavior: "smooth",
        block: "center"
      });
    }
  }

  function makeField(component, error) {
    return h("div", { class: "validation-field" }, component.el, error);
  }

  function clearField(field, error) {
    showFieldError(field, error, false);
  }

  /* ---------- Load existing application ---------- */

  let existing = null;

  try {
    existing = await housingRequest("GET");
  } catch (error) {
    notify(error.message, "negative");
  }

  if (!hasData(existing)) existing = null;
  const saved = existing ? existing.data || {} : {};

  /* ---------- Existing application banner ---------- */

  function existingBanner(record) {
    async function cancel() {
      try {
        await housingRequest("DELETE");
        reload();
      } catch (error) {
        notify(error.message, "negative");
      }
    }

    return h("div", { class: "card" },
      h("p", {
        class: "semibold",
        text: `You submitted this application on ${formatTime(record.submitted_at)}.`
      }),
      h("p", {
        class: "text-sm muted",
        text: `Confirmation ${record.confirmation}. Submitting again below replaces your saved application.`
      }),
      btn("Cancel application", {
        icon: "close",
        variant: "flat",
        dense: true,
        onClick: cancel
      })
    );
  }

  /* ============================================================
     STEP 1: STUDENT INFORMATION
     All four fields are required.
     ============================================================ */

  const studentName = textInput("Full Name", {
    value: saved.full_name || "",
    placeholder: "Enter your full name"
  });

  const studentEmail = textInput("University Email", {
    value: saved.email || "",
    placeholder: "you@unh.edu"
  });

  const studentId = textInput("Student ID", {
    value: saved.student_id || "",
    placeholder: "Enter your student ID"
  });

  const classYear = select("Class Year", CLASS_YEARS, {
    value: saved.class_year || "",
    placeholder: "Select class year"
  });

  const nameError = createErrorMessage("Please enter your full name.");
  const emailError = createErrorMessage("Please enter a valid university email address.");
  const idError = createErrorMessage("Please enter your student ID.");
  const yearError = createErrorMessage("Please select your class year.");

  const nameField = makeField(studentName, nameError);
  const emailField = makeField(studentEmail, emailError);
  const idField = makeField(studentId, idError);
  const yearField = makeField(classYear, yearError);

  function validateStudentInformation() {
    const checks = [
      [getInput(studentName), nameError, !studentName.value.trim()],
      [
        getInput(studentEmail),
        emailError,
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail.value.trim())
      ],
      [getInput(studentId), idError, !studentId.value.trim()],
      [getInput(classYear), yearError, !classYear.value]
    ];

    let firstError = null;

    checks.forEach(([field, error, invalid]) => {
      showFieldError(field, error, invalid);
      if (invalid && !firstError) firstError = error;
    });

    if (firstError) {
      scrollToError(firstError);
      return false;
    }

    return true;
  }

  getInput(studentName).addEventListener("input", () => {
    if (studentName.value.trim()) {
      clearField(getInput(studentName), nameError);
    }
  });

  getInput(studentEmail).addEventListener("input", () => {
    if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail.value.trim())) {
      clearField(getInput(studentEmail), emailError);
    }
  });

  getInput(studentId).addEventListener("input", () => {
    if (studentId.value.trim()) {
      clearField(getInput(studentId), idError);
    }
  });

  getInput(classYear).addEventListener("change", () => {
    if (classYear.value) {
      clearField(getInput(classYear), yearError);
    }
  });

  function clearStudentErrors() {
    clearField(getInput(studentName), nameError);
    clearField(getInput(studentEmail), emailError);
    clearField(getInput(studentId), idError);
    clearField(getInput(classYear), yearError);
  }

  /* ============================================================
     STEP 2: HOUSING PREFERENCES
     Housing style and room type are required.
     Additional considerations are optional.
     ============================================================ */

  const housingStyle = select("Preferred Housing Style", HOUSING_STYLES, {
    value: saved.housing_style || "",
    placeholder: "Select housing style"
  });

  const roomPreference = select("Preferred Room Type", ROOM_PREFERENCES, {
    value: saved.room_preference || "",
    placeholder: "Select room type"
  });

  const accessibility = textArea("Additional Housing Considerations", {
    value: saved.additional_considerations || "",
    placeholder: "Enter any additional information you would like considered."
  });

  const housingStyleError = createErrorMessage("Please select a housing style.");
  const roomError = createErrorMessage("Please select a room type.");

  const housingStyleField = makeField(housingStyle, housingStyleError);
  const roomField = makeField(roomPreference, roomError);

  function validateHousingPreferences() {
    const checks = [
      [getInput(housingStyle), housingStyleError, !housingStyle.value],
      [getInput(roomPreference), roomError, !roomPreference.value]
    ];

    let firstError = null;

    checks.forEach(([field, error, invalid]) => {
      showFieldError(field, error, invalid);
      if (invalid && !firstError) firstError = error;
    });

    if (firstError) {
      scrollToError(firstError);
      return false;
    }

    return true;
  }

  [housingStyle, roomPreference].forEach(component => {
    getInput(component).addEventListener("change", () => {
      if (component.value) {
        const error = component === housingStyle
          ? housingStyleError
          : roomError;

        clearField(getInput(component), error);
      }
    });
  });

  function clearHousingErrors() {
    clearField(getInput(housingStyle), housingStyleError);
    clearField(getInput(roomPreference), roomError);
  }

  /* ============================================================
     STEP 3: ROOMMATE PREFERENCES
     Roommate preference is required.
     Roommate name is conditionally required.
     ============================================================ */

  const roommatePreference = radioGroup(
    "Roommate Preference",
    ROOMMATE_PREFERENCES,
    saved.roommate_preference || ""
  );

  const roommateName = textInput("Preferred Roommate Name", {
    value: saved.roommate_name || "",
    placeholder: "Select 'I have a preferred roommate' to enter a name"
  });

  const roommatePreferenceError =
    createErrorMessage("Please select a roommate preference.");

  const roommateNameError =
    createErrorMessage("Please enter your preferred roommate's name.");

  const roommatePreferenceField =
    makeField(roommatePreference, roommatePreferenceError);

  const roommateNameField =
    makeField(roommateName, roommateNameError);

  const roommateNameInput = getInput(roommateName);

  function hasPreferredRoommate() {
    return roommatePreference.value === "I have a preferred roommate";
  }

  function updateRoommateNameAccess() {
    const preferredRoommate = hasPreferredRoommate();

    roommateNameInput.readOnly = !preferredRoommate;

    roommateNameInput.style.backgroundColor =
      preferredRoommate ? "" : "#f1f3f5";

    roommateNameInput.style.cursor =
      preferredRoommate ? "" : "not-allowed";

    roommateNameInput.placeholder = preferredRoommate
      ? "Enter preferred roommate name"
      : "Select 'I have a preferred roommate' to enter a name";

    if (!preferredRoommate) {
      roommateNameInput.value = "";
      roommateNameInput.setAttribute("aria-invalid", "false");
      showFieldError(roommateNameInput, roommateNameError, false);
    }
  }

  // Apply the correct read-only state when the page loads.
  updateRoommateNameAccess();

  function validateRoommatePreferences() {
    const preferenceInvalid = !roommatePreference.value;
    const nameInvalid =
      hasPreferredRoommate() && !roommateName.value.trim();

    showFieldError(
      roommatePreferenceField,
      roommatePreferenceError,
      preferenceInvalid
    );

    showFieldError(
      roommateNameInput,
      roommateNameError,
      nameInvalid
    );

    if (preferenceInvalid) {
      scrollToError(roommatePreferenceError);
      getRadioInputs(roommatePreference)[0]?.focus({
        preventScroll: true
      });
      return false;
    }

    if (nameInvalid) {
      scrollToError(roommateNameError);
      roommateNameInput.focus({ preventScroll: true });
      return false;
    }

    return true;
  }

  getRadioInputs(roommatePreference).forEach(input => {
    input.addEventListener("change", () => {
      updateRoommateNameAccess();

      if (roommatePreference.value) {
        showFieldError(
          roommatePreferenceField,
          roommatePreferenceError,
          false
        );
      }
    });
  });

  roommateNameInput.addEventListener("input", () => {
    if (roommateName.value.trim()) {
      clearField(roommateNameInput, roommateNameError);
    }
  });

  function clearRoommateErrors() {
    showFieldError(
      roommatePreferenceField,
      roommatePreferenceError,
      false
    );

    clearField(roommateNameInput, roommateNameError);
  }

  /* ---------- Collect application data ---------- */

  function collect() {
    return {
      full_name: studentName.value.trim(),
      email: studentEmail.value.trim(),
      student_id: studentId.value.trim(),
      class_year: classYear.value || "",
      housing_style: housingStyle.value || "",
      room_preference: roomPreference.value || "",
      additional_considerations: accessibility.value.trim(),
      roommate_preference: roommatePreference.value || "",
      roommate_name: hasPreferredRoommate()
        ? roommateName.value.trim()
        : ""
    };
  }

  /* ============================================================
     STEP 4: REVIEW
     Review acknowledgment is required.
     ============================================================ */

  const review = h("div", { class: "col" });

  const reviewConfirmation = checkbox(
    "I have reviewed my application and confirm that the information above is correct.",
    false
  );

  const reviewInput = getCheckboxInput(reviewConfirmation);

  const reviewField = h(
    "div",
    { class: "validation-field" },
    reviewConfirmation.el
  );

  const reviewError =
    createErrorMessage("Please confirm that you have reviewed your application.");

  reviewField.append(reviewError);

  reviewInput.addEventListener("change", () => {
    if (reviewInput.checked) {
      showFieldError(reviewField, reviewError, false);
    }
  });

  function reviewRow(label, value) {
    return h("p", { class: "review-row" },
      h("strong", { text: `${label}: ` }),
      h("span", { text: value || "Not provided" })
    );
  }

  function showReview() {
    // Safety check: do not allow incomplete earlier steps to reach Review.
    if (!validateStudentInformation()) {
      stepper.previous();
      stepper.previous();
      return;
    }

    if (!validateHousingPreferences()) {
      stepper.previous();
      return;
    }

    if (!validateRoommatePreferences()) {
      return;
    }

    const data = collect();

    reviewInput.checked = false;
    showFieldError(reviewField, reviewError, false);

    review.replaceChildren(
      h("h3", {
        class: "text-lg semibold",
        text: "Student Information"
      }),
      reviewRow("Full Name", data.full_name),
      reviewRow("University Email", data.email),
      reviewRow("Student ID", data.student_id),
      reviewRow("Class Year", data.class_year),

      separator(),

      h("h3", {
        class: "text-lg semibold",
        text: "Housing Preferences"
      }),
      reviewRow("Housing Style", data.housing_style),
      reviewRow("Room Type", data.room_preference),
      reviewRow(
        "Additional Considerations",
        data.additional_considerations || "None provided"
      ),

      separator(),

      h("h3", {
        class: "text-lg semibold",
        text: "Roommate Preferences"
      }),
      reviewRow("Roommate Preference", data.roommate_preference),
      reviewRow(
        "Preferred Roommate",
        data.roommate_name || "None specified"
      )
    );

    stepper.next();
  }

  /* ============================================================
     STEP 5: CONFIRMATION
     ============================================================ */

  const confirmationContent = h("div", { class: "col" });

  function showConfirmation(record) {
    const data = record.data || collect();

    confirmationContent.replaceChildren(
      h("div", { class: "card card--pad col" },
        h("div", { class: "row" },
          h("span", {
            class: "material-icons",
            style: "color: var(--positive)",
            "aria-hidden": "true",
            text: "check_circle"
          }),
          h("h2", {
            class: "text-2xl bold",
            text: "Application Submitted"
          })
        ),

        h("p", {
          class: "semibold",
          text: `Confirmation Number: ${record.confirmation}`
        }),

        h("p", {
          class: "muted",
          text: `Submitted ${formatTime(record.submitted_at)}`
        }),

        separator(),

        h("h3", {
          class: "text-lg semibold",
          text: "Student Information"
        }),
        reviewRow("Full Name", data.full_name),
        reviewRow("University Email", data.email),
        reviewRow("Student ID", data.student_id),
        reviewRow("Class Year", data.class_year),

        separator(),

        h("h3", {
          class: "text-lg semibold",
          text: "Housing Preferences"
        }),
        reviewRow("Housing Style", data.housing_style),
        reviewRow("Room Type", data.room_preference),
        reviewRow(
          "Additional Considerations",
          data.additional_considerations || "None provided"
        ),

        separator(),

        h("h3", {
          class: "text-lg semibold",
          text: "Roommate Preferences"
        }),
        reviewRow("Roommate Preference", data.roommate_preference),
        reviewRow(
          "Preferred Roommate",
          data.roommate_name || "None specified"
        ),

        h("p", {
          class: "text-sm muted-2",
          text: "This is a prototype. Nothing is sent to UNH."
        })
      ),

      h("div", { class: "card card--pad col" },
        h("h3", {
          class: "text-lg semibold",
          text: "Next Step: Housing Selection"
        }),

        h("p", {
          class: "muted",
          text: "Browse the residence halls and apartments and choose a room type."
        }),

        h("div", { class: "row mt-2" },
          btn("Go to Housing Selection", {
            icon: "arrow_forward",
            onClick: () => go(SELECTION_ROUTE)
          }),

          btn("Back to Housing Applications", {
            icon: "arrow_back",
            variant: "flat",
            onClick: () => go("housing-applications.html")
          })
        )
      )
    );
  }

  /* ---------- Submit application ---------- */

  async function submitApplication(button) {
    if (!reviewInput.checked) {
      showFieldError(reviewField, reviewError, true);
      reviewInput.focus();
      scrollToError(reviewError);
      return;
    }

    // Final safety check before sending the application to the API.
    if (
      !studentName.value.trim() ||
      !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(studentEmail.value.trim()) ||
      !studentId.value.trim() ||
      !classYear.value ||
      !housingStyle.value ||
      !roomPreference.value ||
      !roommatePreference.value ||
      (hasPreferredRoommate() && !roommateName.value.trim())
    ) {
      notify("Please complete every required field before submitting.", "warning");
      return;
    }

    button.disabled = true;

    try {
      const record = await housingRequest("POST", collect());
      showConfirmation(record);
      stepper.next();
    } catch (error) {
      if (!(error instanceof APIError)) throw error;

      const details = Object.values(error.errors || {}).join(" ");
      notify(`${error.message} ${details}`.trim(), "negative");
    } finally {
      button.disabled = false;
    }
  }

  /* ============================================================
     NAVIGATION BUTTONS
     Each Next button validates its current step first.
     ============================================================ */

  const nextStudent = btn("Next", {
    onClick: () => {
      if (!validateStudentInformation()) return;

      clearStudentErrors();
      stepper.next();
    }
  });

  const nextHousing = btn("Next", {
    onClick: () => {
      if (!validateHousingPreferences()) return;

      clearHousingErrors();
      stepper.next();
    }
  });

  const nextRoommate = btn("Next", {
    onClick: showReview
  });

  function back() {
    return btn("Back", {
      variant: "flat",
      onClick: () => {
        clearStudentErrors();
        clearHousingErrors();
        clearRoommateErrors();
        showFieldError(reviewField, reviewError, false);
        stepper.previous();
      }
    });
  }

  const submitButton = btn("Submit Application", {
    icon: "check",
    onClick: () => submitApplication(submitButton)
  });

  /* ---------- Assemble stepper ---------- */

  const stepperEl = h("div", { class: "stepper" },

    step("Student Information",
      h("h2", {
        class: "text-lg semibold",
        text: "Enter your student information."
      }),
      nameField,
      emailField,
      idField,
      yearField,
      stepNav(nextStudent)
    ),

    step("Housing Preferences",
      h("h2", {
        class: "text-lg semibold",
        text: "Tell us about your housing preferences."
      }),
      housingStyleField,
      roomField,
      accessibility.el,
      stepNav(nextHousing, back())
    ),

    step("Roommate Preferences",
      h("h2", {
        class: "text-lg semibold",
        text: "Provide your roommate preferences."
      }),
      roommatePreferenceField,
      roommateNameField,
      stepNav(nextRoommate, back())
    ),

    step("Review and Submit",
      h("h2", {
        class: "text-lg semibold",
        text: "Review Your Application"
      }),
      h("p", {
        text: "Review your information before submitting."
      }),
      review,
      reviewField,
      stepNav(submitButton, back())
    ),

    step("Confirmation", confirmationContent)
  );

  app.replaceChildren(
    h("div", { class: "row" },
      iconBtn(
        "arrow_back",
        "Back to Housing Applications",
        () => go("housing-applications.html")
      ),
      h("span", {
        class: "muted-2",
        text: "Housing Applications"
      })
    ),

    h("h1", {
      class: "text-3xl bold",
      text: "2026–2027 Housing Application"
    }),

    h("p", {
      class: "muted",
      text: "Complete the following information to begin your on-campus housing application."
    }),

    ...(existing ? [existingBanner(existing)] : []),

    stepperEl
  );

  const stepper = new Stepper(stepperEl, 1);

  // Prevent clicking step indicators from bypassing validated Next buttons.
  stepperEl.addEventListener("click", event => {
    if (!event.target.closest(".step")) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

  stepperEl.addEventListener("keydown", event => {
    if (
      (event.key === "Enter" || event.key === " ") &&
      !event.target.closest(".step")
    ) {
      event.preventDefault();
      event.stopPropagation();
    }
  }, true);

})();
