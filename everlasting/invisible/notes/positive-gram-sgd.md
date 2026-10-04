# Gram 矩阵正定时最小二乘问题的 (S)GD 收敛速率

> 延伸自 https://arxiv.org/abs/2502.07218

# 定理

假设 $H\in\mathbb R^{m\times p},A\in\mathbb R^{m\times q}$ 都是固定的矩阵，$W\in\mathbb R^{p\times q}$ 是待优化的矩阵变量，损失函数为

$$
F(W)=\|HW-A\|_F^2,
$$

其中 $H$ 满足

$$
H^\top H\succ 0
$$

记 $W_t$ 是对它进行梯度下降迭代 $t$​ 步后得到的参数，初始权重为 $W_0$，且 $W^*$ 是最小化上述目标的一个全局最优解。那么，只要学习率 $\eta$ 满足

$$
\eta\leq
\frac{1}{2\|H^\top H\|_2}
$$

则有

$$
F(W_t)-F(W^\star)
\le
(1-\frac{\eta\,\|(H^\top H)^{-1}\|_2}{2})^t\bigl(F(W_0)-F(W^\star)\bigr).
$$

> 给出在带有强凸的条件下，最小二乘问题在梯度下降下的收敛速率。

# 定理的证明

关键是证明 $F$ 的强凸性和光滑性，之后就能使用常用的方式证出指数收敛。

**强凸性**

首先使用和 [最小二乘问题在梯度下降下的收敛速率​](https://www.bilibili.com/opus/1241268741415632929?spm_id_from=333.1369.0.0) 中完全一样的证明，得到

$$
F(Y)
=
F(X)
+
\langle\nabla F(X),Y-X\rangle_F
+
\|H(Y-X)\|_F^2.
\tag{1}
$$

只是我们不使用最后大于等于号的放缩来得到凸性，而是从 $H^\top H\succ0$ 证明强凸性。

令

$$
\Delta=
Y-X=
\begin{bmatrix}
\delta_1&\delta_2&\cdots&\delta_q
\end{bmatrix}.
$$

则

$$
\begin{aligned}
\|H\Delta\|_F^2
&=
\sum_{j=1}^q\|H\delta_j\|_2^2\\
&=
\sum_{j=1}^q\delta_j^\top H^\top H\delta_j.
\end{aligned}
\tag{2}
$$

由于 $H^\top H\succ0$，根据 Rayleigh 商不等式，

$$
\delta_j^\top H^\top H\delta_j
\ge
\lambda_{\min}\|\delta_j\|_2^2
=
\frac{\|\delta_j\|_2^2}{\|(H^\top H)^{-1}\|_2}
\tag{3}
$$

这里 $\lambda_{\mathrm{min}}$ 是 $H^\top H$ 的最小特征值。 由于 $H^\top H$ 是实对称矩阵，自然是正规矩阵，因此奇异值等于特征值的绝对值（这个相等是集合上的相等，包括重数，但顺序不一定）； 又因为 $H^\top H$ 是半正定矩阵（哪怕没有条件中的正定），特征值都非负，所以奇异值等于特征值。特别地，最小特征值等于最小奇异值； 又因为 $H^\top H$ 由条件是正定矩阵，可逆，所以其奇异值是 $(H^\top H)^{-1}$ 的奇异值的倒数。特别地，最小奇异值就是 $(H^\top H)^{-1}$ 最大奇异值的倒数。

因此 $H^\top H$ 的最小特征值为 $(H^\top H)^{-1}$ 的最大奇异值的倒数，也就是谱范数 $\|\cdot\|_2$ 的倒数。

回到前面的证明。把（3）代入（2），得到

$$
\begin{aligned}
\|H\Delta\|_F^2
&\ge
\frac{1}{\|(H^\top H)^{-1}\|_2}
\sum_{j=1}^q\|\delta_j\|_2^2\\
&=
\frac{1}{\|(H^\top H)^{-1}\|_2}\|\Delta\|_F^2.
\end{aligned}
$$

令

$$
\mu=\frac{2}{\|(H^\top H)^{-1}\|_2},
$$

则

$$
\|H\Delta\|_F^2
\ge
\frac{\mu}{2}\|\Delta\|_F^2.
$$

代入式（1），得到

$$
F(Y)
\ge
F(X)
+
\langle\nabla F(X),Y-X\rangle_F
+
\frac{\mu}{2}\|Y-X\|_F^2.
\tag{4}
$$

这正是矩阵形式的 $\mu$\-强凸定义。

**光滑性**

完全同理地：

$$
\begin{aligned}
\|H\Delta\|_F^2
&=
\sum_{j=1}^q\delta_j^\top H^\top H\delta_j\\
&\le
\lambda_{\mathrm{max}}
\sum_{j=1}^q\|\delta_j\|_2^2\\
&=
\|H^\top H\|_2
\sum_{j=1}^q\|\delta_j\|_2^2\\
&=
\|H^\top H\|_2\|\Delta\|_F^2
\end{aligned}
$$

代入式（1），并令 $\beta=2\|H^\top H\|_2$，就有

$$
F(Y)
\le
F(X)
+
\langle\nabla F(X),Y-X\rangle_F
+
\frac{\beta}{2}\|Y-X\|_F^2.
\tag{5}
$$

即 $F$ 是 $\beta$\-光滑的。

至此强凸性和光滑性的证明都完毕，开始分析收敛情况。

梯度下降更新为

$$
W_{t+1}=W_t-\eta\nabla F(W_t).
$$

在光滑性不等式（5）中取

$$
X=W_t,\qquad Y=W_{t+1},
$$

得到

$$
\begin{aligned}
F(W_{t+1})
&\le
F(W_t)
+
\langle\nabla F(W_t),W_{t+1}-W_t\rangle_F\\
&\quad+
\frac{\beta}{2}\|W_{t+1}-W_t\|_F^2.
\end{aligned}
$$

由梯度下降更新公式，

$$
W_{t+1}-W_t=-\eta\nabla F(W_t).
$$

得到

$$
\begin{aligned}
\langle\nabla F(W_t),W_{t+1}-W_t\rangle_F
&=
-\eta\|\nabla F(W_t)\|_F^2,
\end{aligned}
$$

以及

$$
\|W_{t+1}-W_t\|_F^2
=
\eta^2\|\nabla F(W_t)\|_F^2.
$$

代入可得

$$
\begin{aligned}
F(W_{t+1})
&\le
F(W_t)
-\eta\|\nabla F(W_t)\|_F^2
+\frac{\beta\eta^2}{2}\|\nabla F(W_t)\|_F^2\\
&=
F(W_t)
-\eta\left(1-\frac{\beta\eta}{2}\right)
\|\nabla F(W_t)\|_F^2.
\end{aligned}
\tag{6}
$$

因为

$$
0<\eta\le\frac{1}{2\|H^\top H\|_2}=\frac1\beta,
$$

所以

$$
1-\frac{\beta\eta}{2}\ge\frac12.
$$

因此，由式（6）得到

$$
F(W_{t+1})
\le
F(W_t)-\frac{\eta}{2}\|\nabla F(W_t)\|_F^2.
$$

下面关键在于放缩 $\|\nabla F(W_t)\|_F$.

令 $X=W,Y=W^\star$，代入强凸性式（4）并整理：

$$
F(W)-F(W^\star)
\le
\langle\nabla F(W),W-W^\star\rangle_F
-
\frac{\mu}{2}\|W-W^\star\|_F^2.
\tag{7}
$$

令

$$
G=\nabla F(W),
\qquad
D=W-W^\star.
$$

则式（7）为

$$
F(W)-F(W^\star)
\le
\langle G,D\rangle_F-\frac{\mu}{2}\|D\|_F^2.
$$

利用配方法，

$$
\begin{aligned}
\langle G,D\rangle_F-\frac{\mu}{2}\|D\|_F^2
&=
-\frac{\mu}{2}
\left\|D-\frac1\mu G\right\|_F^2
+
\frac{1}{2\mu}\|G\|_F^2\\
&\le
\frac{1}{2\mu}\|G\|_F^2.
\end{aligned}
$$

因此

$$
F(W)-F(W^\star)
\le
\frac{1}{2\mu}\|\nabla F(W)\|_F^2.
$$

等价地，

$$
\|\nabla F(W)\|_F^2
\ge
2\mu\bigl(F(W)-F^\star\bigr).
$$

将这一结果代入式（6），得到

$$
\begin{aligned}
F(W_{t+1})
&\le
F(W_t)
-\frac{\eta}{2}
\cdot 2\mu\bigl(F(W_t)-F^\star\bigr)\\
&=
F(W_t)-\eta\mu\bigl(F(W_t)-F^\star\bigr).
\end{aligned}
$$

两边减去 $F(W^\star)$：

$$
\begin{aligned}
F(W_{t+1})-F(W^\star)
&\le
F(W_t)-F(W^\star)
-\eta\mu\bigl(F(W_t)-F(W^\star)\bigr)\\
&=
(1-\eta\mu)\bigl(F(W_t)-F(W^\star)\bigr).
\end{aligned}
\tag{8}
$$

由于

$$
0<\mu=\frac{2}{\|(H^\top H)^{-1}\|_2}=
2\lambda_{\mathrm{min}}(H^\top H)\le2\lambda_{\mathrm{max}}(H^\top H)=
2\|H^\top H\|_2=\beta
$$

且

$$
0<\eta\le\frac1\beta,
$$

所以

$$
0\le 1-\eta\mu<1.
$$

对式（8）反复应用：

$$
\begin{aligned}
F(W_t)-F^\star
&\le
(1-\eta\mu)\bigl(F(W_{t-1})-F^\star\bigr)\\
&\le
(1-\eta\mu)^2\bigl(F(W_{t-2})-F^\star\bigr)\\
&\quad\vdots\\
&\le
(1-\eta\mu)^t\bigl(F(W_0)-F^\star\bigr).
\end{aligned}
$$

因此

$$
F(W_t)-F^\star
\le
(1-\eta\mu)^t
\bigl(F(W_0)-F^\star\bigr),
\qquad
0<\eta\le\frac1\beta.
$$

由于 $0\le 1-\eta\mu<1$，误差可以达到指数衰减。$\square$

总的来说，关键就在于

$$
\mu\text{-强凸}
\Longrightarrow
\|\nabla F(W)\|_F^2
\ge2\mu(F(W)-F^\star),
$$

以及

$$
\beta\text{-光滑}
\Longrightarrow
F(W_{t+1})
\le
F(W_t)-\frac{\eta}{2}\|\nabla F(W_t)\|_F^2,
$$

二者结合即得到

$$
F(W_{t+1})-F^\star
\le
(1-\eta\mu)(F(W_t)-F^\star),
$$

> 封面取自
> 
> https://osu.ppy.sh/beatmapsets/1075607#osu/2250670
> 
> wowaka - Unhappy Refrain
