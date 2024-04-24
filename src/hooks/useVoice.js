import { useEffect, useState } from 'react'
import SpeechRecognition, { useSpeechRecognition } from 'react-speech-recognition'
import usePrevious from "./usePrevious";
import axios from "axios";

const encodeBase64 = (base64) => {
    var binaryString = window.atob(base64);
    var bytes = new Uint8Array(binaryString.length);
    for (var i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }

    return bytes;
}


const useVoice = ({ setMessage }) => {
    const [isListening, setIsListening] = useState(false)
    const { transcript, resetTranscript, listening, browserSupportsSpeechRecognition, isMicrophoneAvailable } =
        useSpeechRecognition()
    const prevFinalTranscript = usePrevious(transcript)
    const [isTranslate, setIsTranslate] = useState(false)

    const getTranslate = async (text) => {
        try{
            setIsTranslate(true)
            const resp =await axios.post('https://api-dev.iztalk.ai/api/v1/translates/test-translate-vi-to-en', {
                text: text,
            })
            if (resp?.data?.payload?.base64) {
                const data = encodeBase64(resp?.data?.payload?.base64);
                var blob = new Blob([data.buffer], { type: 'audio/wav' });
                const audioElm = document.getElementById('audio-native-translate');
                audioElm.src = URL.createObjectURL(blob);
                audioElm.play();
            }
        }catch (e) {
            console.log(e);
        } finally {
            setIsTranslate(false)
        }
    }


    useEffect(() => {
        if (listening) {
            setMessage(transcript)

            // const newTimeoutId = setTimeout(() => {
            //     if (transcript && prevFinalTranscript && transcript === prevFinalTranscript) {
            //         handleStopRecord()
            //         resetTranscript()
            //         // handleRecord()
            //         // handleSubmitChat(transcript)
            //     }
            // }, 3000)

            // return () => clearTimeout(newTimeoutId)
        } else if (listening) {
            setMessage(transcript)
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [transcript, prevFinalTranscript, resetTranscript, listening,  setMessage])

    const handleStopRecord = () => {
        setIsListening(false)
        SpeechRecognition.abortListening()
        SpeechRecognition.stopListening()
    }

    const handleStartRecord = () => {
        if (!isMicrophoneAvailable) {
            return alert('Please allow microphone access to use this feature.')
        }

        if (!browserSupportsSpeechRecognition) {
            return alert('Browser doesn’t support speech recognition.')
        }

        resetTranscript()

        SpeechRecognition.startListening({
            continuous: true,
            language: 'vi-VN',
        })
        setIsListening(true)
    }

    const handleRecord = () => {
        if (!isListening) {
            handleStartRecord()
        } else {
            handleStopRecord()
            getTranslate(transcript)
        }
    }
    return {
        listening: isListening,
        onRecord: handleRecord,
        isTranslate
    }
}

export default useVoice
