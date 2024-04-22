import {  useState } from 'react'
import { useSpeechSynthesis } from 'react-speech-kit'

const usePlaySound = () => {
    const [isLoading, setIsLoading] = useState(false)
    const [sound, onSetSound] = useState(null)
    const [playingMessageId, onSetPlayingMessageId] = useState(null)
    const { speak, voices, cancel } = useSpeechSynthesis({
        onEnd: () => {
            onSetPlayingMessageId(null)
            onSetSound(null)
        },
    })

    const stopSound = () => {
        sound.pause()
        sound.currentTime = 0
    }

    const playSound = async (text) => {
        setIsLoading(true)
        speak({ text: text, voice: voices.find((voice) => voice.lang === 'vi-VN') })
        // onSetPlayingMessageId(currentPlayingMessageId)
        onSetSound(true)
    }

    return { isLoading, onSpeak: playSound }
}

export default usePlaySound
