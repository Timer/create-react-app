import * as React from 'react';
import './App.css';

function a() {
  console.log('a')
}

class App extends React.Component<{}, null> {
  async componentDidMount() {
    await Promise.resolve();
    //document.body();
  }

  render() {
    let a = '5';
    console.log(a as string);
    return (
      <div className="App">
        <div className="App-header">
          <h2>Welcome to React</h2>
        </div>
        <p className="App-intro">
          To get started, edit <code>src/App.tsx</code> and save to reload.
        </p>
      </div>
    );
  }
}

export default App;
