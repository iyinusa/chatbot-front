import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';
import BleuData from './bleudata';

// Helper function to convert audio buffer to WAV format
const convertToWav = (buffer) => {
  const numOfChan = buffer.numberOfChannels;
  const length = buffer.length * numOfChan * 2 + 44;
  const bufferArray = new ArrayBuffer(length);
  const view = new DataView(bufferArray);

  const channels = [];
  let sample;
  let offset = 0;
  let pos = 0;

  // Write WAV file header
  const setUint16 = (data) => {
    view.setUint16(pos, data, true);
    pos += 2;
  };

  const setUint32 = (data) => {
    view.setUint32(pos, data, true);
    pos += 4;
  };

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8); // file length - 8
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt " chunk
  setUint32(16); // length = 16
  setUint16(1); // PCM (uncompressed)
  setUint16(numOfChan);
  setUint32(buffer.sampleRate);
  setUint32(buffer.sampleRate * 2 * numOfChan); // avg. bytes/sec
  setUint16(numOfChan * 2); // block-align
  setUint16(16); // 16-bit (hardcoded in this demo)

  setUint32(0x61746164); // "data" - chunk
  setUint32(length - pos - 4); // chunk length

  // Write interleaved data
  for (let i = 0; i < buffer.numberOfChannels; i++) {
    channels.push(buffer.getChannelData(i));
  }

  while (pos < length) {
    for (let i = 0; i < numOfChan; i++) {
      sample = Math.max(-1, Math.min(1, channels[i][offset])); // clamp
      sample = (0.5 + sample * 32767) | 0; // scale to 16-bit signed int
      view.setInt16(pos, sample, true); // write 16-bit sample
      pos += 2;
    }
    offset++; // next source sample
  }

  return bufferArray;
};

function App() {
  const [audioUrl, setAudioUrl] = useState('');
  const [language, setLanguage] = useState('en');
  const [recording, setRecording] = useState(false);
  const [mediaRecorder, setMediaRecorder] = useState(null);

  const [messages, setMessages] = useState([
    { sender: 'bot', text: 'How can I be of help today?' },
    { sender: 'user', text: 'I want to cancel my order' },
    { sender: 'bot', text: 'I will be glad to help you, what is the Order Number?' },
    { sender: 'user', text: 'My order number is 1234' },
  ]);

  const [inputText, setInputText] = useState('');
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [referenceText, setReferenceText] = useState('');
  
  const apiUrl = 'http://localhost:5000';

  useEffect(() => {
    if (recording) {
      startRecording();
    } else if (mediaRecorder) {
      mediaRecorder.stop();
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recording]);

  const startRecording = () => {
    navigator.mediaDevices.getUserMedia({ audio: true })
      .then(stream => {
        const recorder = new MediaRecorder(stream);
        setMediaRecorder(recorder);

        const audioChunks = [];
        recorder.ondataavailable = event => {
          audioChunks.push(event.data);
        };

        recorder.onstop = async () => {
          const audioBlob = new Blob(audioChunks, { type: 'audio/webm' });
          const arrayBuffer = await audioBlob.arrayBuffer();
          const audioContext = new (window.AudioContext || window.webkitAudioContext)();
          const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
          const wavBuffer = convertToWav(audioBuffer);

          const formData = new FormData();
          formData.append('audio', new Blob([wavBuffer], { type: 'audio/wav' }), 'audio.wav');
          formData.append('language', language);

          const response = await axios.post(apiUrl + '/process', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });

          // Decode base64 audio content
          const audioContent = response.data.audio_content;
          const audioBlobs = new Blob([Uint8Array.from(atob(audioContent), c => c.charCodeAt(0))], { type: 'audio/mp3' });
          setAudioUrl(URL.createObjectURL(audioBlobs));
        };

        recorder.start();
      })
      .catch(err => console.error('Error accessing microphone', err));
  };

  const toggleRecording = () => {
    setRecording(!recording);
  };

  const handleSendMessage = async () => {
    if (inputText.trim() === '') return;

    const newMessages = [...messages, { sender: 'user', text: inputText }];
    setMessages(newMessages);
    setInputText('');

    const response = await axios.post(apiUrl +  '/chat', { message: inputText, language: language });
    const botMessage = response.data.message;

    setMessages([...newMessages, { sender: 'bot', text: botMessage }]);
    setTargetText(botMessage);
  };

  const handleBleu = async () => {
    if (referenceText.trim() === '') return;

    const response = await axios.post(apiUrl + '/evaluate_bleu', { source: sourceText, target: targetText, reference: referenceText, language: language });
    
    setReferenceText('');

    return response;
  }

  const handleInputChange = (e) => {
    setInputText(e.target.value);
    setSourceText(e.target.value);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSendMessage();
    }
  };

  return (
    <div className="background">
      <div className="chat-spacer"></div>
      <div className="chat-container">
        <div className="chat-header">
          <h1>Multilingual Conversational Dialogue: Case Study of Customer Support Bots <br /><small>Self-learning Conversation Tracking</small></h1>
          
          <select className="language-select" value={language} onChange={(e) => setLanguage(e.target.value)}>
            <option value="en">English</option>
            <option value="hi">Hindi</option>
            <option value="ur">Urdu</option>
            <option value="it">Italian</option>
            <option value="es">Spanish</option>
          </select>
        </div>
        <div className="chat-box">
          {messages.map((msg, index) => (
            <div key={index} className={`chat-message ${msg.sender}`}>
              <p>
                <b>{msg.sender}:</b>
                <div>{msg.text}</div>
              </p>
            </div>
          ))}
        </div>
        {audioUrl && <audio controls src={audioUrl} className='audio-player' autoPlay></audio>}
        <div className="chat-controls">
          <input
            type="text"
            className="message-input"
            value={inputText}
            onChange={handleInputChange}
            onKeyPress={handleKeyPress}
            placeholder="Type a message..."
          />
          <button className="send-button" onClick={handleSendMessage}>
            Send
          </button>
          <button className={recording ? 'stop-recording' : 'record-button'} onClick={toggleRecording}>
            {recording ? 'Stop' : 'Speak'}
          </button>
        </div>
      </div>

      <div className="chat-spacer"></div>
      
      {/* BLEU SCORE EVALUATION */}
      <div className="bleu-container">
        <div className="bleu-header">
          <h1>BLEU (Bilingual Evaluation Understudy) Score Algorithm</h1>
          Conversation Context Handling and Accuracy Evaluation
        </div>
        <div className="bleu-body">
          <div>
            Source Text:<br/>
            <input
              type="text"
              className="input"
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              placeholder="Sources text..."
            /> 
          </div><br/>
          <div>
            Target/Machine-generated Text:<br />
            <input
              type="text"
              className="input"
              value={targetText}
              onChange={(e) => setTargetText(e.target.value)} 
              placeholder="Target/Machine-generated text..."
            /> 
          </div><br />
          <div>
            Expected/Reference Response Text:<br />
            <input
              type="text"
              className="input"
              value={referenceText}
              onChange={(e) => setReferenceText(e.target.value)}
              placeholder="Expected/Reference response text..."
            /> 
            <button className="send-button" onClick={handleBleu}>
              Evaluate
            </button>
          </div>
          <hr></hr>
          <div className="table">
            <BleuData />
          </div>
        </div>
      </div>

      <div className="chat-spacer"></div>
      
      {/* BIAS AND FAIRNESS EVALUATION */}
      <div className="bias-container">
        <div className="bias-header">
          <h1>AI Fairness 360 (AIF360) Algorithm</h1>
          Bias and Fairness Detection Evaluation
        </div>
        <div className="bias-body">

          <hr></hr>
          <div className="table">

          </div>
        </div>
      </div>

      <div className="chat-spacer"></div>
      
    </div>
  );
}

export default App;
