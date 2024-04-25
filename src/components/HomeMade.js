import React, { useCallback, useEffect, useState } from 'react';
import { useSocket } from "../hooks/useSocket";
import AudioRecorder from "../components/AudioRecorder";
import axios from "axios";

const encodeBase64 = (base64) => {
    var binaryString = window.atob(base64);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
}


const HomeMade = () => {
    const [recording, setRecording] = useState(false);
    const [audioContext, setAudioContext] = useState(null);
    const [microphoneSource, setMicrophoneSource] = useState(null);
    const [scriptNode, setScriptNode] = useState(null);
    const { socket } = useSocket();
    const [texts, setTexts] = useState([]);
    const [isEnd, setIsEnd] = useState(null);

    const setupAudioProcessing = async () => {
        try {
            // Set up WebRTC with echo cancellation
            const stream = await navigator.mediaDevices.getUserMedia({ audio: {
                    sampleRate: 16000,
                    sampleSize: 16,
                    channelCount: 1,
                    echoCancellation: true,
                    noiseSuppression: true,
                } });
            try {
                document.getElementById('audio-btn').click()
            }catch (e) {
                alert(e)
            }
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
                socket.emit('audio_stream', { audio: base64Data, end: false });
                document.getElementById('audio-btn').click()
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
            // stop recording
            socket.emit('audio_stream', { audio: '', end: true });
            microphoneSource?.disconnect();
            scriptNode?.disconnect();
            audioContext?.close();
            const text =         texts.reverse().map((text, index) => text).join(' ')
            getTranslate(text)
            // setIsEnd(Date.now());
        } else {
            // start recording
            setupAudioProcessing();
        }
        setRecording(!recording);
    };

    useEffect(() => {
        if (socket) {
            socket.on('data', (data) => {
                console.log('data received:');
                console.log(data)
                if (data?.audio) {
                    playAudioFile(data.audio);
                }
                if (data?.text_translate) {
                    setTexts((prev) => [...prev, data.text_translate]);
                }
            });
        }
    }, [socket])

    const getTranslate = async (text) => {
        try{
            const resp =await axios.post('https://api-dev.iztalk.ai/api/v1/translates/test-translate-vi-to-en', {
                text: text,
            })
            if (resp?.data?.payload?.base64) {
                const data = encodeBase64(resp?.data?.payload?.base64);
                var blob = new Blob([data.buffer], { type: 'audio/wav' });
                const elm = document.getElementById('audio-translate');
                elm.src = URL.createObjectURL(blob);
                elm.play();
            }
        }catch (e) {
            console.log(e);
        }
    }


    return (
        <div className="App">
            <header className="App-header">
                {
                    texts.reverse().map((text, index) => (
                        <p key={index}>
                            {text}
                        </p>
                    ))
                }
                <AudioRecorder/>
                <audio
                    id="audio-recorder"
                    // ref={audioRecordRef}
                    // src="/voice-noise.wav"
                    // autoPlay={true}
                    controls={true}
                    controlsList="nodownload"
                />
                <p>Translate audio</p>
                <audio
                    id="audio-translate"
                    // src="/voice-noise.wav"
                    // autoPlay={true}
                    controls={true}
                    controlsList="nodownload"
                />
                <button onClick={onClick} style={{
                    padding: '10px 20px',
                    backgroundColor: recording ? 'red' : 'blue',
                }}>
                    {recording ? "Stop" : "Start"} Recording
                </button>
            </header>
        </div>
    );
};

export default HomeMade;
