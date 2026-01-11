{
  "endpoint": "POST /merchant-suggestions",
  "request_schema": "MerchantSuggestionCreate",
  "fields": [
    {
      "path": "name",
      "type": "string",
      "required": true,
      "constraints": ["minLength:2", "maxLength:255"]
    },
    {
      "path": "country_code",
      "type": "string",
      "required": true,
      "constraints": ["pattern:^[A-Z]{2}$", "normalized:uppercase"]
    },
    {
      "path": "description",
      "type": "string",
      "required": true,
      "constraints": ["minLength:20", "maxLength:2000"]
    },
    {
      "path": "iban",
      "type": "string",
      "required": true,
      "constraints": [
        "pattern:^[A-Z0-9]+$",
        "minLength:15",
        "maxLength:34",
        "normalized:strip spaces + uppercase"
      ]
    },
    {
      "path": "website_url",
      "type": "string",
      "required": false,
      "constraints": ["url:http/https", "maxLength:512"],
      "default": null
    },
    {
      "path": "category",
      "type": "string",
      "required": false,
      "constraints": ["maxLength:128"],
      "default": null
    },
    {
      "path": "vat_number",
      "type": "string",
      "required": false,
      "constraints": ["maxLength:128", "alias:tax_id"],
      "default": null
    },
    {
      "path": "contact.phone",
      "type": "string",
      "required": true,
      "constraints": ["minLength:4", "maxLength:64"]
    },
    {
      "path": "contact.email",
      "type": "string",
      "required": false,
      "constraints": ["format:email"],
      "default": null
    },
    {
      "path": "address.line1",
      "type": "string",
      "required": true,
      "constraints": ["minLength:2", "maxLength:255"]
    },
    {
      "path": "address.line2",
      "type": "string",
      "required": false,
      "constraints": ["maxLength:255"],
      "default": null
    },
    {
      "path": "address.city",
      "type": "string",
      "required": true,
      "constraints": ["minLength:2", "maxLength:255"]
    },
    {
      "path": "metadata_json",
      "type": "object",
      "required": false,
      "constraints": [],
      "default": null
    },
    {
      "path": "mandate_id",
      "type": "integer",
      "required": false,
      "constraints": ["gt:0"],
      "default": null
    },
    {
      "path": "escrow_id",
      "type": "integer",
      "required": false,
      "constraints": ["gt:0"],
      "default": null
    }
  ]
}
