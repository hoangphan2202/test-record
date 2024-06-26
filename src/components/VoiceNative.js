import React, { useState } from 'react';
import useVoice from "../hooks/useVoice";

const VoiceNative = ({type, setType}) => {
    const [message, setMessage] = useState('')
    const { listening, onRecord, isTranslate } = useVoice({ setMessage })

    return (
        <div className="App">
            <header className="App-header"><p>message:</p>
                {listening && <p>Listening...</p>}
                <p>Translate audio</p>
                {isTranslate && <p>Translating...</p>}
                <audio
                    id="audio-native-translate"
                    // src="/voice-noise.wav"
                    // autoPlay={true}
                    controls={true}
                    controlsList="nodownload"
                />
                <p>
                    {message}
                </p>
                <button onClick={onRecord}>
                    {listening ? 'Stop' : 'Start'}
                </button>
                <p>Type stt: {type}</p>
                <button onClick={() => setType('iFlytek')}>iFlytek</button>
                <button onClick={() => setType('Native')}>Native</button>
                <button onClick={() => setType('Home made')}>Home made</button>
            </header>
        </div>
    );
};

export default VoiceNative;
