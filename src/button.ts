import MyModuleFactory from './outputnonamespace.js';

const input = document.getElementById('textInput') as HTMLInputElement;
const button = document.getElementById('myButton') as HTMLButtonElement;

button.addEventListener('click', () => {
    const text = input.value;
    if (text) {
        alert(`You entered: ${text}`);
        var config = new Module.CommonConfig();
        config.baseName_.push_back(text);
        console.log(config.baseName_);
        config.__destroy__();
        // You can use the text variable here for anything else!
    } else {
        alert('Please enter some text!');
    }
});
