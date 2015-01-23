# liquidfire:Shopify
Easily connect into the Shopify system to begin developing your App. Getting started is really easy! Assuming you already
have created an altair app `altair forge app`, you will do the following.

*This module depends on `titan:Alfred` for handling http requests. 

Run `$ altair alfred forge` in your app's directory to forge a new site if you have not done so already.

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
         "redirectUrl":     "/dashboard",
         "appVersion":      "changes to this trigger update events"
    }
}

```

### 4. Configure Embedded SDK
If you are using the [Embedded SDK](http://docs.shopify.com/embedded-app-sdk) you should drop this into your `layout` files.
 
```html
<script src="https://cdn.shopify.com/s/assets/external/app.js"></script>
<script type="text/javascript">
    ShopifyApp.init({
        apiKey: '<%= shopifyApiKey %>',
        shopOrigin: 'https://<%= shopifyShopName %>.myshopify.com'
    });
</script>
```

## Routes
In order to facilitate the login progress, a few routes are added to Alfred:

* `/shopify` - the login page for your app. Send people here to authenticate them (or install the app on first setup)
* `/auth` - shopify sends people back here and we finish the auth process

## Events
Hook into these events in your `App.js` or any `Controller`;
* `liquidfire:Shopify::will-install` - before an app installed, called on a per shop basis (each shop installs seperately)
* `liquidfire:Shopify::install` - do your install. just do everything in here. the `will/did` events are when dealing with a 3rd party installer you need to configure/manipulate
* `liquidfire:Shopify::did-install` - after all is said and done

Update events map just like install ones, but will be triggered everytime `appVersion` is changed.
* `liquidfire:Shopify::will-update`
* `liquidfire:Shopify::update`
* `liquidfire:Shopify::did-update`

## Example controller
Here is an example of one way you can require a user to be authenticated before being able to see any
page in a controller. 
```js

startup: function (options) {

    //all events pertaining to a request are passed through titan:Alfred. See titan:Alfred/package.json for
    //a description of all events available.
    this.on('titan:Alfred::did-receive-request', {
        'controller': this
    }).then(this.hitch('onDidReceiveRequest'));
  
    //pass call to parent
    return this.inherited(arguments);
  
},
onDidReceiveRequest: function (e) {

    var shopify     = e.get('shopify'),
        response    = e.get('response');

    //if there is no shopify model in the event, we are not authenticated
    if (!shopify) {

        //redirect and stop this event
        response.redirect('/shopify');
        e.stopPropagation();

    }

}

## Force Login on All Pages
Exactly like before, but add the following to your `App.js`. The biggest difference is that we have to make sure we are not redirecting if the requst is handled by the `Shopify` controller.

```js
onDidReceiveRequest: function (e) {

    var shopify     = e.get('shopify'),
        response    = e.get('response'),
        route       = e.get('route');

    //if there is no shopify model in the event, we are not authenticated
    if (route.controller.name !== 'liquidfire:Shopify/controllers/Shopify' && !shopify) {

        //redirect and stop this event
        response.redirect('/shopify');
        e.stopPropagation();

    }

}
```

## REST endpoints
The following endpoints are available to you for your convenience. They mostly map 1-for-1 with [Shopify's own API](http://docs.shopify.com/api).

`/v1/rest/shopify/products.json` - all products. See [Shopify API](http://docs.shopify.com/api/product/) for details.


## Working with Shopify Objects
Objects in Shopify are handled by the `Spectre` entity system. That means, to find a product, you can do the following:

```

this.entity('liquidfire:Shopify/entities/Product').then(function (products) {

    var p = products.create({
        title: 'my new product',
        handle: 'taco'
    });
    
    //will save the product back to shopify asyncronously
    p.save().then(function (product) {
    
        this.log(product.get('title') + ' was created');
    
    }.bind(this).otherwise(function (err) {
    
        this.err(err);
        
    }.bind(this); 
    
    
    //searching
    return products.findOne().where('handle', '===', 'taco').execute();

}).then(function (product) {

    if (product) {
        this.log('yay!'); 
    }
    
}.bind(this));


```