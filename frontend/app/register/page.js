import RegisterForm from '../../components/auth/RegisterForm'

export const metadata = {
  title: 'Create account | CineMatch',
}

export default function RegisterPage() {
  return (
    <div className="min-h-[80vh] flex items-center justify-center px-4">
      <RegisterForm />
    </div>
  )
}
