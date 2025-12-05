/**
 * Toast notification wrapper
 * sonner 패키지의 버전을 명시하여 import
 */
import { toast as sonnerToast, Toaster as SonnerToaster } from 'sonner@2.0.3';

export const toast = sonnerToast;
export const Toaster = SonnerToaster;
