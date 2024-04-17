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

    const playSound = async (messageSelected) => {
        try {
            setIsLoading(true)
            const currentPlayingMessageId = messageSelected.date
            // Nếu id của tin nhắn được bấm khác với id của tin nhắn đang được phát
            if (playingMessageId !== currentPlayingMessageId) {
                // Dừng phát âm thanh hiện tại
                if (sound) {
                    console.log('cancel')
                    cancel()
                    stopSound()
                }
                const currentPlayingMessageId = messageSelected.date
                speak({ text: messageSelected.text, voice: voices.find((voice) => voice.lang === 'vi-VN') })
                onSetPlayingMessageId(currentPlayingMessageId)
                onSetSound(true)
            } else {
                if (sound) {
                    cancel()
                    stopSound()
                }
            }
        } catch (e) {
            console.error(e)
        } finally {
            setIsLoading(false)
        }
    }

    return { isLoading, onSpeak: playSound }
}

export default usePlaySound
