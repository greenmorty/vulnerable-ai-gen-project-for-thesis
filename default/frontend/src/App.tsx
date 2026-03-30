/**
 * Responsibility: Renders the application's top-level router provider.
 */
import { RouterProvider } from "react-router-dom";

import { router } from "./router";

const App = () => {
  return <RouterProvider router={router} />;
};

export default App;

