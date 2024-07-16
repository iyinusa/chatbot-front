import React, { useState, useEffect } from 'react';
import axios from 'axios';

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

          const response = await axios.post('http://localhost:5000/process', formData, {
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

  return (
    <div>
      <h1>Customer Support Chatbot</h1>
      <select value={language} onChange={(e) => setLanguage(e.target.value)}>
        <option value="en">English</option>
        <option value="hi">Hindi</option>
        <option value="ur">Urdu</option>
        <option value="it">Italian</option>
        <option value="es">Spanish</option>
      </select>
      <button onClick={toggleRecording}>
        {recording ? 'Stop Recording' : 'Start Recording'}
      </button>
      {audioUrl && <audio controls src={audioUrl} autoPlay></audio>}
    </div>
  );
}

export default App;
