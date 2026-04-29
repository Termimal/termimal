"use client"

import { useEffect } from "react"
import { Crisp } from "crisp-sdk-web"

type CrispChatProps = {
  email?: string | null
  name?: string | null
}

export default function CrispChat({ email, name }: CrispChatProps) {
  useEffect(() => {
    Crisp.configure("d6ad7e7f-f6e7-4283-822b-1bad7920bfca")

    if (email) {
      Crisp.user.setEmail(email)
    }

    if (name) {
      Crisp.user.setNickname(name)
    }

    Crisp.chat.hide()
  }, [email, name])

  return null
}
