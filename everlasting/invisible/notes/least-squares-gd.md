# 最小二乘问题在梯度下降下的收敛速率

> 问题背景取自 https://arxiv.org/abs/2502.07218

[TOC]

# 命题 List

## 定理 1

假设 $H\in\mathbb R^{m\times p},A\in\mathbb R^{m\times q}$ 都是固定的矩阵，$W\in\mathbb R^{p\times q}$ 是待优化的矩阵变量，损失函数为

$$
F(W)=\|HW-A\|_F^2,
$$

记 $W_t$ 是梯度下降迭代 $t$​ 步后得到的参数，初始权重为 $W_0$，且 $W^*$ 是最小化上述目标的一个全局最优解。那么，只要学习率 $\eta$ 满足

$$
\eta\leq
\frac{1}{2\|H^\top H\|_2}
$$

则有

$$
F(W_t)-F(W^\star)
\le
\frac{\|W_0-W^\star\|_F^2}{2\eta t}.
$$

特别地，这意味着我们有 $O(\frac{1}{t})$ 的收敛速率。

> 给出最小二乘问题在梯度下降下的收敛速率。

# 命题证明 List

## 定理 1 的证明

先求目标函数对 $W$ 的梯度。把 $F$ 写成迹的形式：

$$
\begin{aligned}
F(W)
&=\operatorname{tr}\left((HW-A)^\top(HW-A)\right)\\
&=\operatorname{tr}\left((W^\top H^\top-A^\top)(HW-A)\right)\\
&=\operatorname{tr}(W^\top H^\top HW)
-\operatorname{tr}(W^\top H^\top A)\\
&\quad-\operatorname{tr}(A^\top HW)
+\operatorname{tr}(A^\top A).
\end{aligned}
$$

由于

$$
\operatorname{tr}(A^\top HW)
=\operatorname{tr}\left((A^\top HW)^\top\right)
=\operatorname{tr}(W^\top H^\top A),
$$

所以

$$
F(W)
=\operatorname{tr}(W^\top H^\top HW)
-2\operatorname{tr}(W^\top H^\top A)
+\operatorname{tr}(A^\top A).
$$

使用矩阵求导公式

$$
\frac{\partial}{\partial W}\operatorname{tr}(W^\top BW)
=(B+B^\top)W,
$$

和

$$
\frac{\partial}{\partial W}\operatorname{tr}(W^\top C)=C,
$$

分别代入得

$$
\begin{aligned}
\nabla F(W)
&=2H^\top HW-2H^\top A\\
&=2H^\top(HW-A).
\end{aligned}
$$

因此，对于任意 $W_1,W_2$，

$$
\begin{aligned}
\|\nabla F(W_1)-\nabla F(W_2)\|_F
&=2\|H^\top H(W_1-W_2)\|_F\\
&\le 2\|H^\top H\|_2\|W_1-W_2\|_F.
\end{aligned}
$$

不等号利用了谱范数与 Frobenius 范数的次乘性。

所以梯度的 Lipschitz 常数可以取为

$$
\beta=2\|H^\top H\|_2.
$$

因为 $F$ 的梯度是 $\beta$\-Lipschitz 连续的，所以对于任意 $X,Y$，有下降引理：

$$
F(Y)
\le
F(X)+\langle \nabla F(X),Y-X\rangle_F
+\frac{\beta}{2}\|Y-X\|_F^2,
$$

注意这里的内积是矩阵内积，定义为 $\langle X,Y\rangle_F=\operatorname{Tr}(X^\top Y)$.

梯度下降迭代的规则是

$$
W_{k+1}=W_k-\eta\nabla F(W_k),
$$

在下降引理中，使用如下代入

$$
X=W_k,\qquad
Y=W_{k+1}=W_k-\eta\nabla F(W_k),
$$

得到

$$
\begin{aligned}
F(W_{k+1})
&\le
F(W_k)
-\eta\|\nabla F(W_k)\|_F^2
+\frac{\beta\eta^2}{2}\|\nabla F(W_k)\|_F^2\\
&=
F(W_k)
-\eta\left(1-\frac{\beta\eta}{2}\right)
\|\nabla F(W_k)\|_F^2.
\end{aligned}
$$

由于 $\eta\le 1/\beta$，因此

$$
1-\frac{\beta\eta}{2}\ge \frac12.
$$

于是

$$
F(W_{k+1})
\le
F(W_k)-\frac{\eta}{2}\|\nabla F(W_k)\|_F^2.
$$

特别地，

$$
F(W_{k+1})\le F(W_k),
\tag{1}
$$

所以目标函数值单调不增。

同时还得到

$$
F(W_k)-F(W_{k+1})
\ge
\frac{\eta}{2}\|\nabla F(W_k)\|_F^2.
\tag{2}
$$

接下来我们证明 $F(W)$​ 的凸性，也就是对于任意 $X,Y$，有

$$
F(Y)\ge F(X)+\langle\nabla F(X),Y-X\rangle_F.
$$

首先将 $F(Y)$ 写成

$$
\begin{aligned}
F(X+(Y-X))
&=\|H(X+(Y-X))-A\|_F^2\\
&=\|HX-A+H(Y-X)\|_F^2\\
&=\|HX-A\|_F^2
+2\langle HX-A,H(Y-X)\rangle_F
+\|H(Y-X)\|_F^2\\
&\ge
\|HX-A\|_F^2
+2\langle HX-A,H(Y-X)\rangle_F
\end{aligned}
$$

利用迹的循环性质，

$$
\begin{aligned}
2\langle HX-A,H(Y-X)\rangle_F
&=2\operatorname{Tr}((HX-A)^\top H(Y-X))\\
&=2\operatorname{Tr}\left((H^\top (HX-A))^\top (Y-X)\right)\\
&=\left\langle 2H^\top(HX-A),Y-X\right\rangle_F\\
&=\langle \nabla F(X),Y-X\rangle_F.
\end{aligned}
$$

这就证明了凸性。

（事实上，如果我们对于矩阵形状的梯度

$$
\nabla F(W)=2H^\top(HW-A),
$$

去定义 Hessian 为在某个矩阵方向 $D$ 上的方向导数：

$$
\nabla^2F(W)[D]
:=
\left.\frac{\mathrm d}{\mathrm dt}
\nabla F(W+tD)\right|_{t=0}
$$

则我们可以得到矩阵形式的二阶泰勒展开（略去证明）：

$$
F(Y)
=
F(X)
+\langle \nabla F(X),Y-X\rangle_F
+\frac12
\left\langle
Y-X,\nabla^2F(X)[Y-X]
\right\rangle_F
\tag{3}
$$

在本定理中，

$$
\begin{aligned}
\nabla^2F(W)[D]
&=
\left.\frac{\mathrm d}{\mathrm dt}
\nabla F(W+tD)\right|_{t=0}\\
&=\left.\frac{\mathrm d}{\mathrm dt}
\bigl(2H^\top(H(W+tD)-A)\bigr)\right|_{t=0}\\
&=\left.\frac{\mathrm d}{\mathrm dt}
(2tH^\top HD)\right|_{t=0}\\
&=\;2H^\top HD
\end{aligned}
$$

也可以通过差商来看：

$$
\begin{aligned}
\nabla^2F(W)[D]
&=\lim_{t\to0}
\frac{\nabla F(W+tD)-\nabla F(W)}{t}\\
&=\lim_{t\to0}
\frac{2tH^\top HD}{t}\\
&=2H^\top HD.
\end{aligned}
\tag{4}
$$

在这种矩阵形式下，我们定义 Hessian 的半正定为：对任意与 $W$ 同维度的矩阵 $D$，都有

$$
\langle D,\nabla^2F(W)[D]\rangle_F\ge 0.
$$

那么把（4）代入：

$$
\begin{aligned}
\langle D,\nabla^2F(W)[D]\rangle_F
&=\langle D,2H^\top HD\rangle_F\\
&=2\operatorname{Tr}(D^\top H^\top HD)\\
&=2\operatorname{Tr}\bigl((HD)^\top HD\bigr)\\
&=2\|HD\|_F^2\\
&\ge 0.
\end{aligned}
$$

因此我们的 Hessian 拥有在线性算子意义下的半正定性质。将其代入（3），同样也可以得到凸性。

）

取 $X=W_k$、$Y=W^\star$，可得

$$
F(W^\star)
\ge
F(W_k)+
\langle\nabla F(W_k),W^\star-W_k\rangle.
$$

等价地，

$$
F(W_k)-F^\star
\le
\langle\nabla F(W_k),W_k-W^\star\rangle.
\tag{5}
$$

由梯度下降更新公式，

$$
W_{k+1}-W^\star
=
W_k-W^\star-\eta\nabla F(W_k).
$$

因此，

$$
\begin{aligned}
\|W_{k+1}-W^\star\|_F^2
&=
\|W_k-W^\star\|_F^2
-2\eta
\langle\nabla F(W_k),W_k-W^\star\rangle\\
&\quad
+\eta^2\|\nabla F(W_k)\|_F^2.
\end{aligned}
$$

移项：

$$
\begin{aligned}
\|W_k-W^\star\|_F^2
-\|W_{k+1}-W^\star\|_F^2
&=
2\eta
\langle\nabla F(W_k),W_k-W^\star\rangle\\
&\quad
-\eta^2\|\nabla F(W_k)\|_F^2.
\end{aligned}
$$

利用凸性不等式（5），代入右侧：

$$
\begin{aligned}
\|W_k-W^\star\|_F^2
-\|W_{k+1}-W^\star\|_F^2
&\ge
2\eta\big(F(W_k)-F^\star\big)
-\eta^2\|\nabla F(W_k)\|_F^2.
\end{aligned}
$$

将右侧写成

$$
\begin{aligned}
&2\eta\big(F(W_k)-F^\star\big)
-\eta^2\|\nabla F(W_k)\|_F^2\\
&=
2\eta\big(F(W_{k+1})-F^\star\big)
+2\eta\big(F(W_k)-F(W_{k+1})\big)
-\eta^2\|\nabla F(W_k)\|_F^2.
\end{aligned}
$$

根据式（2），

$$
2\eta\big(F(W_k)-F(W_{k+1})\big)
\ge
\eta^2\|\nabla F(W_k)\|_F^2.
$$

所以

$$
\|W_k-W^\star\|_F^2
-\|W_{k+1}-W^\star\|_F^2
\ge
2\eta\big(F(W_{k+1})-F^\star\big).
$$

也就是

$$
F(W_{k+1})-F^\star
\le
\frac{
\|W_k-W^\star\|_F^2
-\|W_{k+1}-W^\star\|_F^2
}{2\eta}.
$$

对上式从 $k=0$ 到 $t-1$ 求和：

$$
\sum_{k=0}^{t-1}
\big(F(W_{k+1})-F^\star\big)
\le
\frac{1}{2\eta}
\sum_{k=0}^{t-1}
\left(
\|W_k-W^\star\|_F^2
-\|W_{k+1}-W^\star\|_F^2
\right)
=
\frac{
\|W_0-W^\star\|_F^2
-\|W_t-W^\star\|_F^2
}{2\eta}
\le
\frac{\|W_0-W^\star\|_F^2}{2\eta}
\tag{6}
$$

由式（1）的

$$
F(W_t)\le F(W_{k+1}),\qquad k=0,\ldots,t-1.
$$

因此

$$
t\big(F(W_t)-F^\star\big)
\le
\sum_{k=0}^{t-1}
\big(F(W_{k+1})-F^\star\big).
$$

结合式（6），得到

$$
F(W_t)-F^\star
\le
\frac{\|W_0-W^\star\|_F^2}{2\eta t}.
$$

这就证明了我们的结论。

> 封面取自
> 
> https://osu.ppy.sh/beatmapsets/1872527#osu/3956932
> 
> wowaka - Ura-Omote Lovers feat. Hatsune Miku
