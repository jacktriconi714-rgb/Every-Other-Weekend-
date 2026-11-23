# Every Other Weekend website

Static site for the Every Other Weekend sauce brand. No build step: Netlify publishes this folder as-is.

- `index.html`: home (flavors, story, FAQ, pre-sale list sign-up)
- `preorder.html`: pre-order (no payment taken)
- `stores.html`: request a store
- `eow.js`: small shared runtime; forms post to FormSubmit, which emails everyotherweekendsauce@gmail.com

If a send fails, the visitor is offered a prefilled email to the same inbox so no lead is lost.
