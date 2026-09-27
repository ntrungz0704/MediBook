<?php
namespace App\Controllers\Admin;

use App\Core\Controller;
use App\Core\Auth;
use App\Core\Session;
use App\Core\Response;
use App\Models\Specialty;

class SpecialtyController extends Controller {
    public function index(): void {
        Auth::requireRole('admin');

        $specialtyModel = new Specialty();
        $specialties = $specialtyModel->getActiveSpecialties();

        $this->view('admin/specialties/index', [
            'pageTitle' => 'Quản lý chuyên khoa',
            'specialties' => $specialties
        ], 'layouts/admin');
    }

    public function create(): void {
        Auth::requireRole('admin');
        $this->view('admin/specialties/form', [
            'pageTitle' => 'Thêm chuyên khoa mới',
            'specialty' => null
        ], 'layouts/admin');
    }

    public function store(): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $validator = $this->validate([
            'name' => 'required|min:2|unique:specialties,name',
            'slug' => 'required|unique:specialties,slug'
        ]);

        if ($validator->fails()) {
            $this->redirect('/admin/specialties/create');
            return;
        }

        $specialtyModel = new Specialty();
        $specialtyModel->create([
            'name' => $this->request->input('name'),
            'slug' => strtolower($this->request->input('slug')),
            'description' => $this->request->input('description'),
            'icon' => $this->request->input('icon', 'stethoscope'),
            'status' => $this->request->input('status', 'active')
        ]);

        Session::flash('success', 'Thêm chuyên khoa mới thành công!');
        $this->redirect('/admin/specialties');
    }

    public function edit(int $id): void {
        Auth::requireRole('admin');

        $specialtyModel = new Specialty();
        $specialty = $specialtyModel->find($id);

        if (!$specialty) {
            Response::error(404);
            return;
        }

        $this->view('admin/specialties/form', [
            'pageTitle' => 'Chỉnh sửa chuyên khoa: ' . $specialty['name'],
            'specialty' => $specialty
        ], 'layouts/admin');
    }

    public function update(int $id): void {
        Auth::requireRole('admin');
        $this->validateCsrf();

        $validator = $this->validate([
            'name' => "required|min:2|unique:specialties,name,{$id}",
            'slug' => "required|unique:specialties,slug,{$id}"
        ]);

        if ($validator->fails()) {
            $this->redirect('/admin/specialties/edit/' . $id);
            return;
        }

        $specialtyModel = new Specialty();
        $specialtyModel->update($id, [
            'name' => $this->request->input('name'),
            'slug' => strtolower($this->request->input('slug')),
            'description' => $this->request->input('description'),
            'icon' => $this->request->input('icon', 'stethoscope'),
            'status' => $this->request->input('status', 'active')
        ]);

        Session::flash('success', 'Cập nhật chuyên khoa thành công!');
        $this->redirect('/admin/specialties');
    }
}
