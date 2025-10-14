## Decision: Keep listings generic instead of creating type-specific components

**Date:** 2025-10-14  
**Context:** We have restaurants/cafés now, but plan to add hotels and experiences later.  
**Decision:**  
Use generic `listings.component` and `listing-details.component` for all types.  
The type will be provided by the route (`/listings/:type`).

**Rationale:**

- Avoids duplicate logic early on.
- Easier to scale and refactor later.
- Specialized components can extend the base if needed.

**Example:**

```typescript
@Component({
  selector: "app-restaurant-listings",
  templateUrl: "./restaurant-listings.component.html",
})
export class RestaurantListingsComponent extends ListingsComponent {}
```
