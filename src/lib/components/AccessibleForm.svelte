<script>
  import { createEventDispatcher, tick } from 'svelte';
  import { aria, announcer } from '$lib/utils/accessibility.js';

  const dispatch = createEventDispatcher();

  export let fields = [];
  export let values = {};
  export let errors = {};
  export let disabled = false;
  export let validateOnBlur = true;
  export let validateOnChange = false;
  export let showRequired = true;
  export let requiredText = '(required)';

  let formElement;
  let fieldElements = {};

  // Field type configurations
  const fieldConfigs = {
    text: { type: 'text', inputmode: 'text' },
    email: { type: 'email', inputmode: 'email' },
    password: { type: 'password' },
    tel: { type: 'tel', inputmode: 'tel' },
    url: { type: 'url', inputmode: 'url' },
    number: { type: 'number', inputmode: 'numeric' },
    search: { type: 'search' },
    textarea: { element: 'textarea' },
    select: { element: 'select' }
  };

  function handleInput(field, event) {
    const value = event.target.value;
    values[field.name] = value;
    
    dispatch('input', { field: field.name, value, values });
    
    if (validateOnChange) {
      validateField(field, value);
    }
  }

  function handleBlur(field, event) {
    const value = event.target.value;
    
    dispatch('blur', { field: field.name, value, values });
    
    if (validateOnBlur) {
      validateField(field, value);
    }
  }

  function validateField(field, value) {
    const fieldErrors = [];
    
    // Required validation
    if (field.required && (!value || value.trim() === '')) {
      fieldErrors.push(`${field.label} is required`);
    }
    
    // Type-specific validation
    if (value && value.trim() !== '') {
      switch (field.type) {
        case 'email':
          if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            fieldErrors.push('Please enter a valid email address');
          }
          break;
        case 'url':
          try {
            new URL(value);
          } catch {
            fieldErrors.push('Please enter a valid URL');
          }
          break;
        case 'tel':
          if (!/^[\+]?[1-9][\d]{0,15}$/.test(value.replace(/[\s\-\(\)]/g, ''))) {
            fieldErrors.push('Please enter a valid phone number');
          }
          break;
      }
      
      // Length validation
      if (field.minLength && value.length < field.minLength) {
        fieldErrors.push(`Must be at least ${field.minLength} characters`);
      }
      if (field.maxLength && value.length > field.maxLength) {
        fieldErrors.push(`Must be no more than ${field.maxLength} characters`);
      }
      
      // Pattern validation
      if (field.pattern && !new RegExp(field.pattern).test(value)) {
        fieldErrors.push(field.patternMessage || 'Invalid format');
      }
      
      // Custom validation
      if (field.validate) {
        const customError = field.validate(value, values);
        if (customError) {
          fieldErrors.push(customError);
        }
      }
    }
    
    // Update errors
    if (fieldErrors.length > 0) {
      errors[field.name] = fieldErrors;
      announcer.announceUrgent(`${field.label}: ${fieldErrors[0]}`);
    } else {
      delete errors[field.name];
    }
    
    errors = { ...errors };
    dispatch('validate', { field: field.name, errors: fieldErrors, allErrors: errors });
  }

  function handleSubmit(event) {
    event.preventDefault();
    
    // Validate all fields
    let hasErrors = false;
    const allErrors = {};
    
    fields.forEach(field => {
      const value = values[field.name] || '';
      const fieldErrors = [];
      
      // Required validation
      if (field.required && (!value || value.trim() === '')) {
        fieldErrors.push(`${field.label} is required`);
        hasErrors = true;
      }
      
      if (fieldErrors.length > 0) {
        allErrors[field.name] = fieldErrors;
      }
    });
    
    errors = allErrors;
    
    if (hasErrors) {
      // Focus first field with error
      const firstErrorField = fields.find(field => errors[field.name]);
      if (firstErrorField && fieldElements[firstErrorField.name]) {
        fieldElements[firstErrorField.name].focus();
        announcer.announceUrgent(`Form has errors. ${Object.keys(errors).length} fields need attention.`);
      }
      
      dispatch('error', { errors });
      return;
    }
    
    dispatch('submit', { values });
  }

  function getFieldId(field) {
    return `field-${field.name}`;
  }

  function getErrorId(field) {
    return `error-${field.name}`;
  }

  function getHelpId(field) {
    return `help-${field.name}`;
  }

  async function setupFieldAttributes(field, element) {
    if (!element) return;
    
    await tick();
    
    const fieldId = getFieldId(field);
    const errorId = getErrorId(field);
    const helpId = getHelpId(field);
    
    // Basic attributes
    element.id = fieldId;
    element.name = field.name;
    
    // ARIA attributes
    const ariaAttributes = {
      'aria-required': field.required ? 'true' : null,
      'aria-invalid': errors[field.name] ? 'true' : 'false'
    };
    
    // Describedby relationships
    const describedBy = [];
    if (field.help) describedBy.push(helpId);
    if (errors[field.name]) describedBy.push(errorId);
    
    if (describedBy.length > 0) {
      ariaAttributes['aria-describedby'] = describedBy.join(' ');
    }
    
    aria.setAttributes(element, ariaAttributes);
  }

  // Reactive setup for field attributes
  $: fields.forEach(field => {
    const element = fieldElements[field.name];
    if (element) {
      setupFieldAttributes(field, element);
    }
  });
</script>

<form 
  bind:this={formElement}
  on:submit={handleSubmit}
  class="space-y-6"
  novalidate
  aria-label="Form"
>
  {#each fields as field}
    <div class="field-group">
      <!-- Label -->
      <label 
        for={getFieldId(field)}
        class="block text-sm font-medium mb-2"
        style="color: var(--color-text);"
      >
        {field.label}
        {#if field.required && showRequired}
          <span class="text-red-500 ml-1" aria-label="required">{requiredText}</span>
        {/if}
      </label>

      <!-- Input Field -->
      {#if field.type === 'textarea'}
        <textarea
          bind:this={fieldElements[field.name]}
          bind:value={values[field.name]}
          placeholder={field.placeholder || ''}
          rows={field.rows || 4}
          {disabled}
          class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors {errors[field.name] ? 'border-red-500 ring-red-500' : ''}"
          style="background-color: var(--color-background); border-color: {errors[field.name] ? 'var(--color-error)' : 'var(--color-border)'}; color: var(--color-text); ring-color: {errors[field.name] ? 'var(--color-error)' : 'var(--color-primary)'}; ring-offset-color: var(--color-background);"
          on:input={(e) => handleInput(field, e)}
          on:blur={(e) => handleBlur(field, e)}
        ></textarea>
      {:else if field.type === 'select'}
        <select
          bind:this={fieldElements[field.name]}
          bind:value={values[field.name]}
          {disabled}
          class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors {errors[field.name] ? 'border-red-500 ring-red-500' : ''}"
          style="background-color: var(--color-background); border-color: {errors[field.name] ? 'var(--color-error)' : 'var(--color-border)'}; color: var(--color-text); ring-color: {errors[field.name] ? 'var(--color-error)' : 'var(--color-primary)'}; ring-offset-color: var(--color-background);"
          on:change={(e) => handleInput(field, e)}
          on:blur={(e) => handleBlur(field, e)}
        >
          {#if field.placeholder}
            <option value="" disabled>{field.placeholder}</option>
          {/if}
          {#each field.options || [] as option}
            <option value={option.value}>{option.label}</option>
          {/each}
        </select>
      {:else}
        <input
          bind:this={fieldElements[field.name]}
          bind:value={values[field.name]}
          type={fieldConfigs[field.type]?.type || 'text'}
          inputmode={fieldConfigs[field.type]?.inputmode}
          placeholder={field.placeholder || ''}
          min={field.min}
          max={field.max}
          step={field.step}
          minlength={field.minLength}
          maxlength={field.maxLength}
          pattern={field.pattern}
          autocomplete={field.autocomplete}
          {disabled}
          class="w-full px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors {errors[field.name] ? 'border-red-500 ring-red-500' : ''}"
          style="background-color: var(--color-background); border-color: {errors[field.name] ? 'var(--color-error)' : 'var(--color-border)'}; color: var(--color-text); ring-color: {errors[field.name] ? 'var(--color-error)' : 'var(--color-primary)'}; ring-offset-color: var(--color-background);"
          on:input={(e) => handleInput(field, e)}
          on:blur={(e) => handleBlur(field, e)}
        />
      {/if}

      <!-- Help Text -->
      {#if field.help}
        <p 
          id={getHelpId(field)}
          class="mt-1 text-sm"
          style="color: var(--color-textSecondary);"
        >
          {field.help}
        </p>
      {/if}

      <!-- Error Messages -->
      {#if errors[field.name]}
        <div 
          id={getErrorId(field)}
          class="mt-1 text-sm"
          style="color: var(--color-error);"
          role="alert"
          aria-live="polite"
        >
          {#each errors[field.name] as error}
            <p>{error}</p>
          {/each}
        </div>
      {/if}
    </div>
  {/each}

  <!-- Form Actions -->
  <div class="flex items-center justify-end gap-3 pt-4">
    <slot name="actions">
      <button
        type="submit"
        {disabled}
        class="px-4 py-2 rounded-lg font-medium focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        style="background-color: var(--color-primary); color: white; ring-color: var(--color-primary); ring-offset-color: var(--color-background);"
      >
        Submit
      </button>
    </slot>
  </div>
</form>

<style>
  /* Focus styles */
  input:focus,
  textarea:focus,
  select:focus {
    outline: 2px solid var(--color-primary);
    outline-offset: 2px;
  }

  /* High contrast mode adjustments */
  :global(.high-contrast) input,
  :global(.high-contrast) textarea,
  :global(.high-contrast) select {
    border-width: 2px;
  }

  :global(.high-contrast) button {
    border: 2px solid;
  }

  /* Error state improvements for high contrast */
  :global(.high-contrast) .border-red-500 {
    border-color: #dc2626 !important;
    border-width: 3px;
  }

  /* Focus-visible support */
  @supports selector(:focus-visible) {
    input:focus:not(:focus-visible),
    textarea:focus:not(:focus-visible),
    select:focus:not(:focus-visible),
    button:focus:not(:focus-visible) {
      outline: none;
      box-shadow: none;
    }
    
    input:focus-visible,
    textarea:focus-visible,
    select:focus-visible,
    button:focus-visible {
      outline: 2px solid var(--color-primary);
      outline-offset: 2px;
    }
  }

  /* Reduced motion adjustments */
  :global(.reduce-motion) * {
    transition: none !important;
    animation: none !important;
  }

  /* Improve readability */
  .field-group {
    position: relative;
  }

  /* Custom select styling */
  select {
    appearance: none;
    background-image: url("data:image/svg+xml;charset=utf-8,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 20 20'%3E%3Cpath stroke='%236b7280' stroke-linecap='round' stroke-linejoin='round' stroke-width='1.5' d='M6 8l4 4 4-4'/%3E%3C/svg%3E");
    background-position: right 8px center;
    background-repeat: no-repeat;
    background-size: 16px;
    padding-right: 32px;
  }

  /* Ensure form is keyboard navigable */
  .field-group {
    scroll-margin-top: 20px;
  }
</style>