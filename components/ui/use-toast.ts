import { toast as sonnerToast } from 'sonner'

type ToastProps = {
  description?: string
  action?: {
    label: string
    onClick: () => void
  }
}

export const toast = {
  error: (message: string, props?: ToastProps) => {
    return sonnerToast.error(message, {
      description: props?.description,
      action: props?.action,
    })
  },

  success: (message: string, props?: ToastProps) => {
    return sonnerToast.success(message, {
      description: props?.description,
      action: props?.action,
    })
  },

  warning: (message: string, props?: ToastProps) => {
    return sonnerToast.warning(message, {
      description: props?.description,
      action: props?.action,
    })
  },

  info: (message: string, props?: ToastProps) => {
    return sonnerToast.info(message, {
      description: props?.description,
      action: props?.action,
    })
  },

  dismiss: () => {
    sonnerToast.dismiss()
  },
}
