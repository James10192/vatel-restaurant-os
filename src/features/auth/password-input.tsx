import { useState } from 'react'
import type { ComponentProps } from 'react'
import { EyeIcon, EyeOffIcon, LockIcon } from 'lucide-react'
import { InputGroup, InputGroupAddon, InputGroupButton, InputGroupInput } from '#/components/ui/input-group'
import { useT } from '#/i18n/i18n'

/** Champ mot de passe avec bouton afficher/masquer (InputGroup shadcn). */
export function PasswordInput({ className, ...props }: Omit<ComponentProps<typeof InputGroupInput>, 'type'>) {
  const t = useT()
  const [visible, setVisible] = useState(false)
  const Icon = visible ? EyeOffIcon : EyeIcon
  return (
    <InputGroup className={className}>
      <InputGroupAddon>
        <LockIcon />
      </InputGroupAddon>
      <InputGroupInput {...props} type={visible ? 'text' : 'password'} />
      <InputGroupAddon align="inline-end">
        <InputGroupButton
          size="icon-xs"
          aria-label={visible ? t('Masquer le mot de passe') : t('Afficher le mot de passe')}
          aria-pressed={visible}
          onClick={() => setVisible(!visible)}
        >
          <Icon />
        </InputGroupButton>
      </InputGroupAddon>
    </InputGroup>
  )
}
