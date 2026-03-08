{
  "nodes": [
    {
      "parameters": {
        "httpMethod": "POST",
        "path": "order-events",
        "responseMode": "responseNode",
        "options": {}
      },
      "id": "45fbac13-bde1-46ab-869a-4027284afad4",
      "name": "Order Events Webhook",
      "type": "n8n-nodes-base.webhook",
      "typeVersion": 2,
      "position": [
        -1008,
        0
      ],
      "webhookId": "order-events"
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "condition-order-created",
              "leftValue": "={{ $json.body.eventType }}",
              "rightValue": "order_created",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "d1836ed3-7adc-4046-8aa6-4677c3ed9eb1",
      "name": "Is Order Created?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        -160,
        -432
      ]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "condition-order-created-smart",
              "leftValue": "={{ $json.body.eventType }}",
              "rightValue": "order_created_smart",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "1e98290b-445f-47c5-9f09-f271abc9e86b",
      "name": "Is Merchant Notification?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        -160,
        -224
      ]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "condition-order-assigned",
              "leftValue": "={{ $json.body.eventType }}",
              "rightValue": "order_assigned",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "837ba276-6215-465e-90d9-70218a8ce1fe",
      "name": "Is Order Assigned?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        -160,
        -32
      ]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "condition-order-shipped",
              "leftValue": "={{ $json.body.eventType }}",
              "rightValue": "order_shipped",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "75f4aacb-9b09-482c-8b2b-4240f6e8ca02",
      "name": "Is Order Shipped?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        -160,
        176
      ]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "condition-order-delivered",
              "leftValue": "={{ $json.body.eventType }}",
              "rightValue": "order_delivered",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "43a00531-1d73-434a-81f9-dbb0b4fed408",
      "name": "Is Order Delivered?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        -160,
        368
      ]
    },
    {
      "parameters": {
        "conditions": {
          "options": {
            "caseSensitive": true,
            "leftValue": "",
            "typeValidation": "strict"
          },
          "conditions": [
            {
              "id": "condition-order-accepted",
              "leftValue": "={{ $json.body.eventType }}",
              "rightValue": "order_accepted",
              "operator": {
                "type": "string",
                "operation": "equals"
              }
            }
          ],
          "combinator": "and"
        },
        "options": {}
      },
      "id": "3e2bba5a-f69b-4c62-9afa-a25314b01b15",
      "name": "Is Order Accepted?",
      "type": "n8n-nodes-base.if",
      "typeVersion": 2,
      "position": [
        -160,
        576
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "authkey",
              "value": "={{ $env.MSG91_AUTH_KEY }}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"integrated_number\": \"916201176610\",\n  \"content_type\": \"template\",\n  \"payload\": {\n    \"messaging_product\": \"whatsapp\",\n    \"type\": \"template\",\n    \"template\": {\n      \"name\": \"orderconfirmation\",\n      \"language\": {\n        \"code\": \"en\",\n        \"policy\": \"deterministic\"\n      },\n      \"namespace\": \"2d94a314_a4ca_45d8_a3a5_3970af9d866a\",\n      \"to_and_components\": [\n        {\n          \"to\": [\"91{{ $json.body.orderData.customerPhone }}\"],\n          \"components\": {\n            \"body_1\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.customerName || 'Customer' }}\" },\n            \"body_2\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.orderNumber }}\" },\n            \"body_3\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.items ? $json.body.orderData.items.map(i => i.quantity + 'x ' + i.productName).join(', ') : 'Items' }}\" },\n            \"body_4\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.totalAmount }}\" },\n            \"body_5\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.customerAddress || 'Address' }}\" }\n          }\n        }\n      ]\n    }\n  }\n}",
        "options": {}
      },
      "id": "5bdf0a29-59a2-4d73-83c4-d995af9020e2",
      "name": "Send Order Confirmation to Customer",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        144,
        -448
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "authkey",
              "value": "={{ $env.MSG91_AUTH_KEY }}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"integrated_number\": \"916201176610\",\n  \"content_type\": \"template\",\n  \"payload\": {\n    \"messaging_product\": \"whatsapp\",\n    \"type\": \"template\",\n    \"template\": {\n      \"name\": \"merchantneworder_uat\",\n      \"language\": {\n        \"code\": \"en\",\n        \"policy\": \"deterministic\"\n      },\n      \"namespace\": \"2d94a314_a4ca_45d8_a3a5_3970af9d866a\",\n      \"to_and_components\": [\n        {\n          \"to\": [\"91{{ $json.body.merchantData.phone }}\"],\n          \"components\": {\n            \"body_1\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.orderNumber }}\" },\n            \"body_2\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.items ? $json.body.orderData.items.map(i => i.quantity + 'x ' + i.productName).join(', ') : 'Items' }}\" },\n            \"body_3\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.totalAmount }}\" },\n            \"body_4\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.paymentMethod === 'cod' ? 'Cash on Delivery' : 'Online Payment' }}\" },\n            \"body_5\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.customerArea || '' }}\" },\n            \"body_6\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.customerAddress || '' }}\" },\n            \"body_7\": { \"type\": \"text\", \"value\": \"{{ $json.body.smartData ? String($json.body.smartData.distance) : '0' }}\" },\n            \"button_1\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderId + '.' + $json.body.itemId + '.' + $json.body.merchantData.phone }}\" }\n          }\n        }\n      ]\n    }\n  }\n}",
        "options": {}
      },
      "id": "9fca87b2-64e1-4e19-b20f-67488e57be4d",
      "name": "Send New Order to Merchant",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        144,
        -240
      ]
    },
    {
      "parameters": {},
      "id": "f4a4ce14-bbb0-4fe3-9c45-6ab1f334bba9",
      "name": "Skip - No Notification on Assign",
      "type": "n8n-nodes-base.noOp",
      "typeVersion": 1,
      "position": [
        144,
        32
      ],
      "notes": "order_assigned does not send any notification. Merchant already got notified via order_created_smart."
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "authkey",
              "value": "={{ $env.MSG91_AUTH_KEY }}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"integrated_number\": \"916201176610\",\n  \"content_type\": \"template\",\n  \"payload\": {\n    \"messaging_product\": \"whatsapp\",\n    \"type\": \"template\",\n    \"template\": {\n      \"name\": \"orderdispatched\",\n      \"language\": {\n        \"code\": \"en\",\n        \"policy\": \"deterministic\"\n      },\n      \"namespace\": \"2d94a314_a4ca_45d8_a3a5_3970af9d866a\",\n      \"to_and_components\": [\n        {\n          \"to\": [\"91{{ $json.body.orderData.customerPhone }}\"],\n          \"components\": {\n            \"body_1\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.customerName || 'Customer' }}\" },\n            \"body_2\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.orderNumber }}\" }\n          }\n        }\n      ]\n    }\n  }\n}",
        "options": {}
      },
      "id": "28049ab9-edf4-4ab2-9ab5-ab6d3d8ff44f",
      "name": "Send Order Dispatched to Customer",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        144,
        160
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "authkey",
              "value": "={{ $env.MSG91_AUTH_KEY }}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"integrated_number\": \"916201176610\",\n  \"content_type\": \"template\",\n  \"payload\": {\n    \"messaging_product\": \"whatsapp\",\n    \"type\": \"template\",\n    \"template\": {\n      \"name\": \"orderdelivery\",\n      \"language\": {\n        \"code\": \"en\",\n        \"policy\": \"deterministic\"\n      },\n      \"namespace\": \"2d94a314_a4ca_45d8_a3a5_3970af9d866a\",\n      \"to_and_components\": [\n        {\n          \"to\": [\"91{{ $json.body.orderData.customerPhone }}\"],\n          \"components\": {\n            \"body_1\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.customerName || 'Customer' }}\" },\n            \"body_2\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.orderNumber }}\" }\n          }\n        }\n      ]\n    }\n  }\n}",
        "options": {}
      },
      "id": "3df6dfe1-4476-4297-ae03-cdb0502d9a0a",
      "name": "Send Order Delivered to Customer",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        144,
        368
      ]
    },
    {
      "parameters": {
        "method": "POST",
        "url": "https://api.msg91.com/api/v5/whatsapp/whatsapp-outbound-message/bulk/",
        "sendHeaders": true,
        "headerParameters": {
          "parameters": [
            {
              "name": "authkey",
              "value": "={{ $env.MSG91_AUTH_KEY }}"
            },
            {
              "name": "Content-Type",
              "value": "application/json"
            }
          ]
        },
        "sendBody": true,
        "specifyBody": "json",
        "jsonBody": "={\n  \"integrated_number\": \"916201176610\",\n  \"content_type\": \"template\",\n  \"payload\": {\n    \"messaging_product\": \"whatsapp\",\n    \"type\": \"template\",\n    \"template\": {\n      \"name\": \"merchantorderacceptance\",\n      \"language\": {\n        \"code\": \"en\",\n        \"policy\": \"deterministic\"\n      },\n      \"namespace\": \"2d94a314_a4ca_45d8_a3a5_3970af9d866a\",\n      \"to_and_components\": [\n        {\n          \"to\": [\"91{{ $json.body.triggeredBy.userPhone }}\"],\n          \"components\": {\n            \"body_1\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.orderNumber }}\" },\n            \"body_2\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.customerName || 'Customer' }}\" },\n            \"body_3\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.customerAddress || 'Address' }}\" },\n            \"body_4\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.customerPhone }}\" },\n            \"body_5\": { \"type\": \"text\", \"value\": \"{{ $json.body.orderData.items ? $json.body.orderData.items.map(i => i.quantity + 'x ' + i.productName).join(', ') : 'Items' }}\" }\n          }\n        }\n      ]\n    }\n  }\n}",
        "options": {}
      },
      "id": "90707631-6fb4-45ec-b2e3-97e678ab54b1",
      "name": "Send Order Acceptance to Merchant",
      "type": "n8n-nodes-base.httpRequest",
      "typeVersion": 4.2,
      "position": [
        144,
        576
      ]
    },
    {
      "parameters": {
        "respondWith": "json",
        "responseBody": "={{ { success: true, message: 'Event processed', eventType: $json.body.eventType } }}",
        "options": {}
      },
      "id": "ef793c1c-8f0a-4f9e-b878-ca9ec8d8ffe1",
      "name": "Respond Success",
      "type": "n8n-nodes-base.respondToWebhook",
      "typeVersion": 1.1,
      "position": [
        1472,
        -48
      ]
    }
  ],
  "connections": {
    "Order Events Webhook": {
      "main": [
        [
          {
            "node": "Is Order Created?",
            "type": "main",
            "index": 0
          },
          {
            "node": "Is Merchant Notification?",
            "type": "main",
            "index": 0
          },
          {
            "node": "Is Order Assigned?",
            "type": "main",
            "index": 0
          },
          {
            "node": "Is Order Shipped?",
            "type": "main",
            "index": 0
          },
          {
            "node": "Is Order Delivered?",
            "type": "main",
            "index": 0
          },
          {
            "node": "Is Order Accepted?",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Is Order Created?": {
      "main": [
        [
          {
            "node": "Send Order Confirmation to Customer",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Is Merchant Notification?": {
      "main": [
        [
          {
            "node": "Send New Order to Merchant",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Is Order Assigned?": {
      "main": [
        [
          {
            "node": "Respond Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Is Order Shipped?": {
      "main": [
        [
          {
            "node": "Send Order Dispatched to Customer",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Is Order Delivered?": {
      "main": [
        [
          {
            "node": "Send Order Delivered to Customer",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Is Order Accepted?": {
      "main": [
        [
          {
            "node": "Send Order Acceptance to Merchant",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Send Order Confirmation to Customer": {
      "main": [
        [
          {
            "node": "Respond Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Send New Order to Merchant": {
      "main": [
        [
          {
            "node": "Respond Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Skip - No Notification on Assign": {
      "main": [
        [
          {
            "node": "Respond Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Send Order Dispatched to Customer": {
      "main": [
        [
          {
            "node": "Respond Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Send Order Delivered to Customer": {
      "main": [
        [
          {
            "node": "Respond Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    },
    "Send Order Acceptance to Merchant": {
      "main": [
        [
          {
            "node": "Respond Success",
            "type": "main",
            "index": 0
          }
        ]
      ]
    }
  },
  "pinData": {},
  "meta": {
    "instanceId": "85576016574f1f8138cb27b76ce3892889f76b1222579e15c618352326c19da5"
  }
}