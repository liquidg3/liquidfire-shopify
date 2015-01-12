# liquidfire:Shopify
Easily connect into the Shopify system to begin developing your App. Getting started is really easy! Assuming you already
have created an altair app `altair forge app`, you will do the following.

*This module depends on `titan:Alfred` for handling http requests. Run `$ altair alfred forge` in your app's directory to forge a new site.`

### 1. Add the following to your `package.json`
```json
"altairDependencies": {
    "liquidfire:Shopify": ">=0.0.x"
}
```
### 2. Install it
```bin
$altair l package
```

### 3. Configure it inside your `modules.json` and `modules-dev.json`.
```json

{
    "liquidfire:Shopify": {
        "shopName":         "myshop", 
         "apiKey":          "your api key",
         "sharedSecret":    "your shared secret",
         "scope":           "read_content, write_content, read_themes, write_themes, read_products, write_products, read_customers, write_customers, read_orders, write_orders, read_script_tags, write_script_tags, read_fulfillments, write_fulfillments, read_shipping, write_shipping",
         "redirectUrl":     "/dashboard"
    }
}

```