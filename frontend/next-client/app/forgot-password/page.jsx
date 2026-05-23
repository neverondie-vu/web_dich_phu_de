import AuthForm from "../../components/AuthForm";

export const metadata = {
  title: "Quên mật khẩu | AutoSub",
};

export default function ForgotPasswordPage() {
  return <AuthForm mode="forgot" />;
}
