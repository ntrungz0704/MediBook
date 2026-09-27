<?php
namespace App\Controllers;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Models\User;

class AuthController extends Controller {
    public function showLogin(): void {
        if (Auth::check()) {
            $this->redirectByRole(Auth::role());
            return;
        }

        $this->view('auth/login', [
            'pageTitle' => 'Đăng nhập - MediBook'
        ], 'layouts/main');
    }

    public function login(): void {
        $this->validateCsrf();

        $validator = $this->validate([
            'email' => 'required|email',
            'password' => 'required'
        ]);

        if ($validator->fails()) {
            $this->redirect('/login');
            return;
        }

        $email = $this->request->input('email');
        $password = $this->request->input('password');

        if (Auth::attempt($email, $password)) {
            $this->logActivity('USER_LOGIN', 'User', Auth::id(), 'Đăng nhập thành công');
            Session::flash('success', 'Đăng nhập thành công. Chào mừng bạn quay lại MediBook!');

            $intended = Session::get('intended_url');
            if ($intended) {
                Session::remove('intended_url');
                $this->redirect($intended);
                return;
            }

            $this->redirectByRole(Auth::role());
            return;
        }

        Session::flash('error', 'Email hoặc mật khẩu không chính xác.');
        $this->redirect('/login');
    }

    public function showRegister(): void {
        if (Auth::check()) {
            $this->redirectByRole(Auth::role());
            return;
        }

        $this->view('auth/register', [
            'pageTitle' => 'Đăng ký tài khoản - MediBook'
        ], 'layouts/main');
    }

    public function register(): void {
        $this->validateCsrf();

        $validator = $this->validate([
            'name' => 'required|min:2|max:100',
            'email' => 'required|email|unique:users,email',
            'phone' => 'required|min:9|max:15',
            'password' => 'required|min:6|confirmed'
        ]);

        if ($validator->fails()) {
            $this->redirect('/register');
            return;
        }

        $userModel = new User();
        $userId = $userModel->createPatientUser(
            $this->request->input('name'),
            $this->request->input('email'),
            $this->request->input('password'),
            $this->request->input('phone')
        );

        $user = $userModel->find($userId);
        Auth::login($user);

        $this->logActivity('USER_REGISTER', 'User', $userId, 'Đăng ký tài khoản bệnh nhân');
        Session::flash('success', 'Đăng ký tài khoản thành công! Bạn có thể đặt lịch khám ngay.');
        $this->redirect('/appointments/book');
    }

    public function logout(): void {
        if (Auth::check()) {
            $this->logActivity('USER_LOGOUT', 'User', Auth::id(), 'Đăng xuất khỏi hệ thống');
            Auth::logout();
        }
        Session::flash('info', 'Bạn đã đăng xuất an toàn.');
        $this->redirect('/login');
    }

    private function redirectByRole(?string $role): void {
        switch ($role) {
            case 'admin':
                $this->redirect('/admin/dashboard');
                break;
            case 'doctor':
                $this->redirect('/doctor/dashboard');
                break;
            case 'receptionist':
                $this->redirect('/receptionist/dashboard');
                break;
            case 'patient':
            default:
                $this->redirect('/');
                break;
        }
    }
}
