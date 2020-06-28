import React from 'react';
import './App.css';
// Required to apply the default styling
import '@aws-amplify/ui/dist/style.css';
import { withAuthenticator, AmplifySignOut } from '@aws-amplify/ui-react'

// apply the config object to amplify

function App() {
  return (
    <div className="App">
      We are authenticated
      <AmplifySignOut />
    </div>
  );
}

export default withAuthenticator(App);
