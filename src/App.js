import logo from './logo.svg';
import './App.css';
import { useCallback, useEffect, useRef, useState } from "react";
import {useSocket} from "./hooks/useSocket";
import AudioRecorder from "./components/AudioRecorder";
function App() {
  const [recording, setRecording] = useState(false);
  const [audioContext, setAudioContext] = useState(null);
  const [microphoneSource, setMicrophoneSource] = useState(null);
  const [scriptNode, setScriptNode] = useState(null);
  const [fileRecorded, setFileRecorded] = useState(null);

  // const { socket } = useSocket();
  const [texts, setTexts] = useState([]);
  const audioRef = useRef(null);
  const audioRecordRef = useRef(null);
  const fileRef = useRef(null);

  const setupAudioProcessing = async () => {
    try {
      // Set up WebRTC with echo cancellation
      const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, sampleRate: 16000, } });
      // Set up Web Audio API for noise suppression
      const _audioContext = new (window.AudioContext || window.webkitAudioContext)({
        sampleRate: 16000, // Set the sample rate to 16000
      });
      const _microphoneSource = _audioContext.createMediaStreamSource(stream);
      const _scriptNode = _audioContext.createScriptProcessor(4096, 1, 1);
      _scriptNode.onaudioprocess = function(event) {
        const inputData = event.inputBuffer.getChannelData(0);
        const buffer = new Int16Array(inputData.length);

        for (let i = 0; i < inputData.length; i++) {
          buffer[i] = inputData[i] * 0x7fff;
        }

        // Convert audio data to Uint8Array
        const uint8ArrayData = new Uint8Array(buffer.buffer);

        // Convert Uint8Array to base64
        let binary = '';
        uint8ArrayData.forEach(function(byte) {
          binary += String.fromCharCode(byte);
        });
        const base64Data = btoa(binary);
        console.log('1111', base64Data.length)
        setFileRecorded(binary)
        // socket.emit('audio_stream', { audio: base64Data, end: false });
        // Your base64 audio data is now available for processing or handling
      };
      _microphoneSource.connect(_scriptNode);
      _scriptNode.connect(_audioContext.destination);
      setAudioContext(_audioContext);
      setMicrophoneSource(_microphoneSource);
      setScriptNode(_scriptNode);
    } catch (error) {
      console.error('Error accessing microphone or setting up audio processing:', error);
    }
  };

  const playAudioFile = useCallback((base64Data) => {
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const decodedData = atob(base64Data);
    const arrayBuffer = new ArrayBuffer(decodedData.length);
    const view = new Uint8Array(arrayBuffer);
    for (let i = 0; i < decodedData.length; i++) {
      view[i] = decodedData.charCodeAt(i);
    }
    audioContext.decodeAudioData(arrayBuffer, function(buffer) {
      const source = audioContext.createBufferSource();
      source.buffer = buffer;
      source.connect(audioContext.destination);
      source.start(0);
    }, function(err) {
      console.error('Error decoding audio data:', err);
    });
  }, [audioContext]);

  const onClick = () => {
    if (recording) {
      console.log(fileRecorded);
      // stop recording
      // socket.emit('audio_stream', { audio: '', end: true });
      microphoneSource?.disconnect();
      scriptNode?.disconnect();
      audioContext?.close();
      playAudioFile(fileRecorded)
    } else {
      // start recording
      setupAudioProcessing();
    }
    setRecording(!recording);
  };

  // useEffect(() => {
  //   if (socket) {
  //     socket.on('data', (data) => {
  //       console.log('data received:');
  //       console.log(data)
  //       if (data?.audio) {
  //         playAudioFile(data.audio);
  //       }
  //       if (data?.text_translate) {
  //         setTexts((prev) => [...prev, data.text_translate]);
  //       }
  //     });
  //   }
  // }, [socket])

  const playAudio = (e) => {
    if (e.target.files.length) {
      const file = e.target.files[0];
      const url = URL.createObjectURL(file);
      audioRef.current.src = url;
      audioRef.current.play();

      const audio = audioRef.current

      audio.onplay = (e) => {
        // When seek to begin of audio
        if ( e.target.currentTime === 0 ) {
          console.log('When seek to begin of audio');
          return;
        }
        // When seek any where
        if ( e.target.currentTime !== 0 ) {
          console.log('When seek any where');
          return;
        }
        console.log('Audio play first time from 0');
        const audioMediaSource = audioRef.captureStream();

        audioMediaSource.then((backgroundAudioStream) => {
          const videoTracks = backgroundAudioStream.getVideoTracks();
          if ( videoTracks.length > 0 ) {
            videoTracks.map( videoTrack => {
              backgroundAudioStream.removeTrack(videoTrack);
              // Let it go
              videoTrack.stop();
            });
          }
        })
        // const audioTrack = backgroundAudioStream.getAudioTracks()[0];
        // if ( audioTrack ) {
        //   this.localBackgroundAudioTrack = audioTrack;
        //
        //   // Handle for Presenter: add to Presenter media stream via audioMerger
        //   const audioMerger = this.audioMerger;
        //   if ( audioMerger && audioMerger.started && backgroundAudioStream ) {
        //     audioMerger.addStream( backgroundAudioStream );
        //   }
        //
        //   // Handle for Viewer peer connections
        //   // Use to push to viewer peerConnection when make invite connection or replace if the viewer peerConnection already existed
        //   // Cannot use current audioMerger result because it contain viewer audio
        //   // Create new audio merger for connection to viewer
        //   // Just merge audio
        //   // Create new audio merger for localAudio and background audio
        //   const inviteAudioMerger = this.inviteAudioMerger = new VideoStreamMerger();
        //   inviteAudioMerger.addStream(backgroundAudioStream);
        //   inviteAudioMerger.addStream(this.localAudioStream);
        //   // Start the merging. Calling this makes the result available to us
        //   inviteAudioMerger.start();
        //   // Note: when presenter share audio and connect to viewer after that, let get audio from
        //   // inviteAudioMerger to use in antWebRTCMediaStream
        //
        //   const newAudioTrack = inviteAudioMerger.result.getAudioTracks()[0];
        //   Object.values(this.peerConnections).map( async peerConnection => {
        //     const presenterMediaStream = peerConnection.getLocalPresenterStream();
        //     if ( presenterMediaStream ) {
        //       const currentPresenterAudioTrack = presenterMediaStream.getAudioTracks()[0];
        //       await peerConnection.replaceTrack(currentPresenterAudioTrack, newAudioTrack);
        //     }
        //   });
        //
        //   // Change the audio share state when all things done
        //   setTimeout(() => {
        //     // Cause by if the user seek right after the audio input appear
        //     // Sometime we got quiet sound, so just display the audio input after 1s to prevent it
        //     console.log('setIsAudioShared:', shareAudio);
        //     this.props.setIsAudioShared(shareAudio);
        //   }, 500);
        //
        //   // When user click stop share source on chrome sharing bar
        //   backgroundAudioStream.addEventListener('inactive', this.handleBackgroundAudioStreamInactive);
        // } else {
        //   console.log('Cannot get background audio sound, please try again or contact to supporter!');
        // }
      };
    }
  }

  return (
    <div className="App">
      <header className="App-header">
        <input
            ref={fileRef}
            type="file"
            onChange={playAudio}
        />
        <audio
            ref={audioRef}
            autoPlay={true}
            controls={true}
            controlsList="nodownload"
        />
        <AudioRecorder onFinish={({ id, audio }) => {
          audioRecordRef.current.src = window.URL.createObjectURL(audio);

        }}/>

        <audio ref={audioRecordRef} autoPlay={false} controls/>
        <button
            // onClick={downloadAudio}
        >download audio</button>
        {
          texts.reverse().map((text, index) => (
              <p key={index}>
                {text}
              </p>
          ))
        }
        <button onClick={onClick} style={{
          padding: '10px 20px',
          backgroundColor: recording ? 'red' : 'blue',
        }}>
          {recording ? "Stop" : "Start"} Recording
        </button>
      </header>
    </div>
  );
}

export default App;
